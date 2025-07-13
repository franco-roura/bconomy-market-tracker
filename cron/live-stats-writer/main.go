package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MarketListings struct {
	ItemId int `json:"id"`
	Price int `json:"price"`
	Quantity int `json:"amount"`
}

var conn *pgxpool.Pool

func init() {
	// Initialize the DB client outside of the handler, during the init phase
	var err error
	config, err := pgxpool.ParseConfig(os.Getenv("DB_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeCacheDescribe
	conn, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
}

func getMarketListings(ctx context.Context, itemId int) ([]MarketListings, error) {
	log.Printf("Getting market listings for item %d", itemId)
	apiKey := os.Getenv("BCONOMY_API_KEY")
	url := "https://bconomy.net/api/data"
	
	// Create request body
	requestBody := map[string]interface{}{
		"type": "marketListings",
		"itemId": itemId,
	  }
	
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("Error marshaling request body: %v", err)
		return []MarketListings{}, err
	}
	
	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		return []MarketListings{}, err
	}
	
	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	
	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		return []MarketListings{}, err
	}
	defer resp.Body.Close()
	
	// Parse response into JSON object
	var parsedData []MarketListings
	if err := json.NewDecoder(resp.Body).Decode(&parsedData); err != nil {
		log.Printf("Error decoding response: %v", err)
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Error reading response body: %v", err)
			return []MarketListings{}, err
		}
		log.Printf("Response: %v", string(body))
		return []MarketListings{}, err
	}
	log.Printf("Market listings fetched")
	return parsedData, nil
}

func getItemPrice(ctx context.Context, itemId int) (int, error) {
	log.Printf("Getting item price for item %d", itemId)
	query := `
		SELECT price FROM item_price_history
		WHERE item_id = $1
		ORDER BY timestamp DESC
		LIMIT 1
	`
	row := conn.QueryRow(ctx, query, itemId)
	var price int
	err := row.Scan(&price)
	if err != nil {
		log.Printf("Error getting item price: %v", err)
		return 0, err
	}
	log.Printf("Item price fetched")
	return price, nil
}

func getItemOpeningPrice(ctx context.Context, itemId int) (int, error) {
	log.Printf("Getting item opening price for item %d", itemId)
	query := `
		SELECT price FROM item_price_history
		WHERE item_id = $1
		AND DATE(timestamp) = CURRENT_DATE
		ORDER BY timestamp ASC
		LIMIT 1
	`
	row := conn.QueryRow(ctx, query, itemId)
	var price int
	err := row.Scan(&price)
	if err != nil {
		log.Printf("Error getting item opening price: %v", err)
		return 0, err
	}
	log.Printf("Item opening price fetched")
	return price, nil
}

func getItemPriceRange(ctx context.Context, itemId int) (int, int, error) {
	log.Printf("Getting item price range for item %d", itemId)
	query := `
		SELECT MIN(price), MAX(price) FROM item_price_history
		WHERE item_id = $1
		AND DATE(timestamp) = CURRENT_DATE
	`
	row := conn.QueryRow(ctx, query, itemId)
	var minPrice int
	var maxPrice int
	err := row.Scan(&minPrice, &maxPrice)
	if err != nil {
		log.Printf("Error getting item lowest price: %v", err)
		return 0, 0, err
	}
	log.Printf("Item price range fetched")
	return minPrice, maxPrice, nil
}

func handleRequest(ctx context.Context, event json.RawMessage) error {
	// Create channels to receive results from goroutines
	marketListingsChan := make(chan []MarketListings, 1)
	priceChan := make(chan int, 1)
	openingPriceChan := make(chan int, 1)
	priceRangeChan := make(chan struct {
		min int
		max int
	}, 1)
	errorChan := make(chan error, 4)

	// Launch goroutines to fetch data in parallel
	go func() {
		marketListings, err := getMarketListings(ctx, 111)
		if err != nil {
			errorChan <- err
			return
		}
		marketListingsChan <- marketListings
	}()

	go func() {
		price, err := getItemPrice(ctx, 111)
		if err != nil {
			errorChan <- err
			return
		}
		priceChan <- price
	}()

	go func() {
		openingPrice, err := getItemOpeningPrice(ctx, 111)
		if err != nil {
			errorChan <- err
			return
		}
		openingPriceChan <- openingPrice
	}()

	go func() {
		minPrice, maxPrice, err := getItemPriceRange(ctx, 111)
		if err != nil {
			errorChan <- err
			return
		}
		priceRangeChan <- struct {
			min int
			max int
		}{minPrice, maxPrice}
	}()

	// Collect results from all goroutines
	var marketListings []MarketListings
	var price, openingPrice, minPrice, maxPrice int

	// Wait for all goroutines to complete and collect results
	for range 4 {
		select {
		case err := <-errorChan:
			log.Printf("Error in goroutine: %v", err)
			return err
		case marketListings = <-marketListingsChan:
		case price = <-priceChan:
		case openingPrice = <-openingPriceChan:
		case priceRange := <-priceRangeChan:
			minPrice = priceRange.min
			maxPrice = priceRange.max
		}
	}

	// Get the supply with a for loop
	supply := 0
	for _, listing := range marketListings {
		supply += listing.Quantity
	}

	// Insert the data into the db
	tx, err := conn.Begin(ctx)
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return err
	}
	defer tx.Rollback(ctx)
	query := `
		INSERT INTO live_stats (item_id, last_known_price, opening_price, highest_price_today, lowest_price_today, supply)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (item_id) DO UPDATE SET
			last_known_price = $2,
			opening_price = $3,
			highest_price_today = $4,
			lowest_price_today = $5,
			supply = $6
	`
	_, err = tx.Exec(ctx, query, 111, price, openingPrice, maxPrice, minPrice, supply)
	if err != nil {
		log.Printf("Error inserting live stats: %v", err)
		return err
	}
	
	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		log.Printf("Error committing transaction: %v", err)
		return err
	}
	
	return nil
}

func main() {
	lambda.Start(handleRequest)
}
