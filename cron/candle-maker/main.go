package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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

	// Add timeout configurations to prevent network timeouts
	config.ConnConfig.ConnectTimeout = 30 * time.Second
	config.ConnConfig.RuntimeParams["statement_timeout"] = "300000"                   // 5 minutes
	config.ConnConfig.RuntimeParams["idle_in_transaction_session_timeout"] = "300000" // 5 minutes

	conn, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
}

func main() {
	lambda.Start(handleRequest)
}

func handleRequest(ctx context.Context, event json.RawMessage) error {
	// Get total count first to determine pagination
	var totalCount int
	err := conn.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM item_price_history 
		WHERE timestamp >= CURRENT_DATE
	`).Scan(&totalCount)
	if err != nil {
		log.Printf("Error getting count: %v", err)
		return err
	}

	log.Printf("Total records to process: %d", totalCount)

	pageSize := 1000
	totalPages := (totalCount + pageSize - 1) / pageSize

	// Channel to collect results from goroutines
	type PriceData struct {
		ItemID    int
		Price     int
		Timestamp time.Time
	}

	type CandleResult struct {
		ItemID    int
		Open      int
		High      int
		Low       int
		Close     int
		Timestamp time.Time
	}

	resultChan := make(chan PriceData, totalCount)
	errorChan := make(chan error, totalPages)
	doneChan := make(chan bool, totalPages) // Signal when each goroutine completes

	// Process each page in a goroutine
	for page := 0; page < totalPages; page++ {
		go func(pageNum int) {
			offset := pageNum * pageSize

			// Create a new connection for this goroutine
			pageConn, err := pgxpool.NewWithConfig(ctx, conn.Config())
			if err != nil {
				errorChan <- fmt.Errorf("failed to create connection for page %d: %v", pageNum, err)
				doneChan <- true
				return
			}
			defer pageConn.Close()

			rows, err := pageConn.Query(ctx, `
				SELECT item_id, price, timestamp
				FROM item_price_history
				WHERE timestamp >= CURRENT_DATE
				ORDER BY item_id, timestamp DESC
				LIMIT $1 OFFSET $2;
			`, pageSize, offset)
			if err != nil {
				errorChan <- fmt.Errorf("failed to query page %d: %v", pageNum, err)
				doneChan <- true
				return
			}
			defer rows.Close()

			// Send raw price data to channel
			for rows.Next() {
				var itemID int
				var price int
				var timestamp time.Time
				err := rows.Scan(&itemID, &price, &timestamp)
				if err != nil {
					errorChan <- fmt.Errorf("failed to scan row in page %d: %v", pageNum, err)
					doneChan <- true
					return
				}

				resultChan <- PriceData{
					ItemID:    itemID,
					Price:     price,
					Timestamp: timestamp,
				}
			}

			if err := rows.Err(); err != nil {
				errorChan <- fmt.Errorf("error iterating rows in page %d: %v", pageNum, err)
				doneChan <- true
				return
			}

			log.Printf("Processed page %d/%d", pageNum+1, totalPages)
			doneChan <- true
		}(page)
	}

	// Collect all raw price data
	var allPriceData []PriceData
	completedPages := 0

	// First, wait for all goroutines to complete
	for completedPages < totalPages {
		select {
		case <-doneChan:
			completedPages++
		case err := <-errorChan:
			log.Printf("Error in goroutine: %v", err)
			return err
		case <-time.After(30 * time.Second):
			return fmt.Errorf("timeout waiting for goroutines to complete")
		}
	}

	// Now collect all the raw price data
	for {
		select {
		case priceData := <-resultChan:
			allPriceData = append(allPriceData, priceData)
		default:
			// No more data, we're done
			goto done
		}
	}
done:

	log.Printf("Collected %d price records from %d pages", len(allPriceData), totalPages)

	// Now aggregate the price data into candles
	type Candle struct {
		Open      int
		OpenTime  time.Time
		High      int
		Low       int
		Close     int
		CloseTime time.Time
		Timestamp time.Time
	}

	// Group by item_id and hour, then aggregate
	hourlyCandles := make(map[int]map[time.Time]*Candle)

	for _, priceData := range allPriceData {
		// Truncate to the last hour
		hourlyTruncatedTimestamp := priceData.Timestamp.Truncate(time.Hour)

		if _, ok := hourlyCandles[priceData.ItemID]; !ok {
			hourlyCandles[priceData.ItemID] = make(map[time.Time]*Candle)
		}

		candle, exists := hourlyCandles[priceData.ItemID][hourlyTruncatedTimestamp]
		if !exists {
			hourlyCandles[priceData.ItemID][hourlyTruncatedTimestamp] = &Candle{
				Open:      priceData.Price,
				OpenTime:  priceData.Timestamp,
				High:      priceData.Price,
				Low:       priceData.Price,
				Close:     priceData.Price,
				CloseTime: priceData.Timestamp,
				Timestamp: hourlyTruncatedTimestamp,
			}
		} else {
			// Update high/low as needed
			if priceData.Price > candle.High {
				candle.High = priceData.Price
			}
			if priceData.Price < candle.Low {
				candle.Low = priceData.Price
			}
			if priceData.Timestamp.After(candle.CloseTime) {
				candle.Close = priceData.Price
				candle.CloseTime = priceData.Timestamp
			}
			if priceData.Timestamp.Before(candle.OpenTime) {
				candle.Open = priceData.Price
				candle.OpenTime = priceData.Timestamp
			}
		}
	}

	// Convert to final result format
	var allCandles []CandleResult
	for itemID, candles := range hourlyCandles {
		for _, candle := range candles {
			allCandles = append(allCandles, CandleResult{
				ItemID:    itemID,
				Open:      candle.Open,
				High:      candle.High,
				Low:       candle.Low,
				Close:     candle.Close,
				Timestamp: candle.Timestamp,
			})
		}
	}

	log.Printf("Collected %d candles from %d pages", len(allCandles), totalPages)

	// Now insert all the candles in batches
	if len(allCandles) > 0 {
		// Insert in batches of 100 to prevent timeouts
		batchSize := 100
		totalInserted := 0
		var wg sync.WaitGroup

		for i := 0; i < len(allCandles); i += batchSize {
			wg.Add(1)
			go func() {
				defer wg.Done()
				end := min(i + batchSize, len(allCandles))

				batch := allCandles[i:end]
				args := []interface{}{}
				values := []string{}
				argIndex := 1

				for _, candle := range batch {
					values = append(values, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d, '1h')", argIndex, argIndex+1, argIndex+2, argIndex+3, argIndex+4, argIndex+5))
					args = append(args, candle.ItemID, candle.Open, candle.High, candle.Low, candle.Close, candle.Timestamp)
					argIndex += 6
				}

				query := fmt.Sprintf(`
				INSERT INTO item_price_candle (item_id, open, high, low, close, timestamp, interval) 
				VALUES %s ON CONFLICT (item_id, timestamp, interval) 
				DO UPDATE SET 
					open = EXCLUDED.open,
					high = EXCLUDED.high,
					low = EXCLUDED.low,
					close = EXCLUDED.close,
					timestamp = EXCLUDED.timestamp;
			`, strings.Join(values, ", "))

				_, err = conn.Exec(ctx, query, args...)
				if err != nil {
					log.Printf("Error inserting batch %d-%d: %v", i+1, end, err)
					return
				}

				totalInserted += len(batch)
				log.Printf("Inserted batch %d-%d (%d candles)", i+1, end, len(batch))
			}()
		}
		wg.Wait()

		log.Printf("Total inserted: %d candles", totalInserted)
	}

	return nil
}
