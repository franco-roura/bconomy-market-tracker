package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MarketPreview struct {
	LastUpdated int `json:"lastUpdated"`
	Data map[string]int `json:"data"`
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

func handleRequest(ctx context.Context, event json.RawMessage) error {
	apiKey := os.Getenv("BCONOMY_API_KEY")
	url := "https://bconomy.net/api/data"
	
	// Create request body
	requestBody := map[string]interface{}{
		"type": "marketPreview",
	  }
	
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("Error marshaling request body: %v", err)
		return err
	}
	
	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		return err
	}
	
	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	
	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		return err
	}
	defer resp.Body.Close()
	
	// Parse response into JSON object
	var parsedData MarketPreview
	if err := json.NewDecoder(resp.Body).Decode(&parsedData); err != nil {
		log.Printf("Error decoding response: %v", err)
		return err
	}
	
	// Display parsed, fetched data
	log.Printf("Parsed data: %+v", parsedData.Data)
	log.Printf("Successfully scraped market values")

	// Build batch insert query
	var values []string
	var args []interface{}
	argIndex := 1
	
	for i := range 165 {
		itemKey := fmt.Sprintf("item%d", i)
		if value, exists := parsedData.Data[itemKey]; exists {
			// Convert Unix timestamp (milliseconds) to time.Time
			timestamp := time.Unix(int64(parsedData.LastUpdated)/1000, 0)
			values = append(values, fmt.Sprintf("($%d, $%d, $%d)", argIndex, argIndex+1, argIndex+2))
			args = append(args, i, value, timestamp)
			argIndex += 3
		}
	}
	
	if len(values) > 0 {
		// Use a transaction to avoid prepared statement conflicts
		tx, err := conn.Begin(ctx)
		if err != nil {
			log.Printf("Error starting transaction: %v", err)
			return err
		}
		defer tx.Rollback(ctx)
		
		query := fmt.Sprintf("INSERT INTO item_price_history (item_id, price, timestamp) VALUES %s ON CONFLICT (item_id, timestamp) DO NOTHING", strings.Join(values, ", "))
		_, err = tx.Exec(ctx, query, args...)
		if err != nil {
			log.Printf("Error inserting price history: %v", err)
			return err
		}
		
		err = tx.Commit(ctx)
		if err != nil {
			log.Printf("Error committing transaction: %v", err)
			return err
		}
		
		log.Printf("Inserted %d price records", len(args)/3)
	}
	return nil
}

func main() {
	lambda.Start(handleRequest)
}
