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

	return parsedData, nil
}

func getItemPrice(ctx context.Context, itemId int) (int, error) {
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
	return price, nil
}

func getItemOpeningPrice(ctx context.Context, itemId int) (int, error) {
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
	return price, nil
}

func getItemPriceRange(ctx context.Context, itemId int) (int, int, error) {
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
	return minPrice, maxPrice, nil
}

func handleRequest(ctx context.Context, event json.RawMessage) error {	// Get the current market listings for the item
	marketListings, err := getMarketListings(ctx, 111)
	if err != nil {
		log.Printf("Error getting market listings: %v", err)
		return err
	}
	// Get the supply with a for loop
	supply := 0
	for _, listing := range marketListings {
		supply += listing.Quantity
	}
	// Get the current price for the item from db
	price, err := getItemPrice(ctx, 111)
	if err != nil {
		log.Printf("Error getting item price: %v", err)
		return err
	}
	// Get the opening price for the item from db
	openingPrice, err := getItemOpeningPrice(ctx, 111)
	if err != nil {
		log.Printf("Error getting item opening price: %v", err)
		return err
	}
	// Get today's price range for the item from db
	minPrice, maxPrice, err := getItemPriceRange(ctx, 111)
	if err != nil {
		log.Printf("Error getting item lowest price: %v", err)
		return err
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
