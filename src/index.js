import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
dotenv.config();

const app = express()
app.use(express.json());
app.use(cors)
const mongoClient = new MongoClient("mongodb://localhost:27017/test");
let db;

mongoClient.connect()
  .then(() => db = mongoClient.db())
  .catch(err => console.log(err.message));


  
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Rodando na porta ${port}`));