# Bconomy Market Tracker

A simple market data tracking application for [Bconomy](https://bconomy.net/play/) built with **SST**, **Go**, and **Next.js**. The system automatically scrapes market data every 5 minutes and provides a web interface to view the collected data.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- [Bun](https://bun.sh/) (recommended) or npm/yarn
- Go 1.21+
- [SST CLI](https://docs.sst.dev/start/quickstart#install-the-sst-cli)
- AWS CLI configured

### Development Setup

1. **Clone and install dependencies:**

   ```bash
   git clone git@github.com:franco-roura/bconomy-market-tracker.git
   cd bconomy-market-tracker
   bun install
   ```

2. **Start the development environment:**

   ```bash
   bunx sst dev
   ```

3. **Access the application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - SST Console: Check terminal output for the SST Console URL

## 🔧 Components

### Go Scraper (`cron/`)

- Runs every 5 minutes via AWS EventBridge
- Scrapes market data from the game's API
- Stores data in Supabase via SST resources

### Next.js Frontend (`app/`)

- Average React application with App Router
- Displays scraped market data

### SST Infrastructure (`sst.config.ts`)

- Defines AWS resources for the former 2

## 🚀 Deployment

### How to host your own version of this thing

1. Set up an AWS account, install the aws cli and put `AWS_PROFILE=<yourprofile>` in the `.env` file.

2. Spin up a postgres DB wherever you like (Supabase, Neon, etc.) and put `DB_URL=<yoururl>` in the `.env` file.

3. Get an api key for the game and put `BCONOMY_API_KEY=<key>` in your `.env` file.

4. **Run this bad boy**
   ```bash
   bunx sst deploy
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the WTFPL License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Check the [SST Documentation](https://docs.sst.dev/)
- Review [Next.js Documentation](https://nextjs.org/docs)
- Open an issue in this repository
