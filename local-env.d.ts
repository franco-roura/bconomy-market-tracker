declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_PASSWORD: string;
    }
  }
}
