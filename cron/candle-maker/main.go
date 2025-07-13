package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
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
	tx, err := conn.Begin(ctx)
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return err
	}
	defer tx.Rollback(ctx)
	
	rows, err := tx.Query(ctx, `
		SELECT item_id, price, timestamp
		FROM item_price_history
		WHERE timestamp >= CURRENT_DATE
		ORDER BY item_id, timestamp DESC;
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type Candle struct {
		Open  int
		High  int
		Low   int
		Close int
		Timestamp time.Time
	}
	hourlyCandles := make(map[int]map[time.Time]*Candle)

	for rows.Next() {
		var itemID int
		var price int
		var timestamp time.Time
		err := rows.Scan(&itemID, &price, &timestamp)
		if err != nil {
			return err
		}
		// Truncate to the last hour
		var hourlyTruncatedTimestamp = timestamp.Truncate(time.Hour)

		if _, ok := hourlyCandles[itemID]; !ok {
			hourlyCandles[itemID] = make(map[time.Time]*Candle)
		}

		candle, exists := hourlyCandles[itemID][hourlyTruncatedTimestamp]
		if !exists {
			hourlyCandles[itemID][hourlyTruncatedTimestamp] = &Candle{
				Open:  price,
				High:  price,
				Low:   price,
				Close: price,
				Timestamp: hourlyTruncatedTimestamp,
			}
		} else {
			if price > candle.High {
				candle.High = price
			}
			if price < candle.Low {
				candle.Low = price
			}
			// Sorting by timestamp the last one is the close
			candle.Close = price
		}

		args := []interface{}{}
		values := []string{}
		argIndex := 1	
		for itemID, candles := range hourlyCandles {
			for _, candle := range candles {
				values = append(values, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d, '1h')", argIndex, argIndex+1, argIndex+2, argIndex+3, argIndex+4, argIndex+5))
				args = append(args, itemID, candle.Open, candle.High, candle.Low, candle.Close, candle.Timestamp)
				argIndex += 6
			}
		}
		
		query := fmt.Sprintf(`
			INSERT INTO item_price_candle (item_id, open, high, low, close, timestamp, interval) 
			VALUES %s ON CONFLICT (item_id, timestamp, interval) DO NOTHING;
		`, strings.Join(values, ", "))
		_, err = tx.Exec(ctx, query, args...)
		if err != nil {
			log.Printf("Error inserting candles: %v", err)
			return err
		}
		
		err = tx.Commit(ctx)
		if err != nil {
			log.Printf("Error committing transaction: %v", err)
			return err
		}
		
		log.Printf("Inserted %d candles", len(args)/6)
	}
	return nil
}
