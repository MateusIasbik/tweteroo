import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dotenv from "dotenv";

dotenv.config();

const app = express()
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
  .then(() => {
    db = mongoClient.db();
    console.log("Conectado ao banco de dados");
  })
  .catch(err => console.log(err.message));

const userSchema = joi.object({
  username: joi.string().required(),
  avatar: joi.string().uri().required()
});

const tweetSchema = joi.object({
  username: joi.string().required(),
  tweet: joi.string().required()
});

app.post("/users", async (req, res) => {

  const { username, avatar } = req.body;
  const validate = userSchema.validate(req.body, { abortEarly: false });

  if (validate.error) {
    return res.status(422).send("Nome de usuário e avatar são obrigatórios");
  }

  try {
    const existingUser = await db.collection("users").findOne({ username });
    if (existingUser) {
      return res.status(409).send("Nome de usuário já existe!");
    }

    const user = {
      username,
      avatar
    }

    await db.collection("users").insertOne(user);
    return res.sendStatus(201);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.post("/tweets", async (req, res) => {

  const { username, tweet } = req.body;
  const validate = tweetSchema.validate(req.body, { abortEarly: false });

  if (validate.error) {
    return res.status(422).send("Nome de usuário e mensagem tweet são obrigatórios");
  }

  if (!username) {
    return res.status(401).send("Usuário não está logado!");
  }

  try {
    const user = await db.collection("users").findOne({ username });
    if (!user) {
      return res.status(401).send("Usuário não está logado!");
    }

    const tweetMessage = {
      username,
      tweet
    };
    
    await db.collection("tweets").insertOne(tweetMessage);
    return res.sendStatus(201);
  } catch (err) {
    return res.status(500).send(err.message);
  }
})

// app.get("/users", async (req, res) => {
//   try {
//     const users = await db.collection("users").find().toArray();
//     return res.status(200).send(users);
//   } catch (err) {
//     return res.status(500).send(err.message);
//   }
// })

app.get("/tweets", async (req, res) => {

  try {
    const tweets = await db.collection("tweets").find().toArray();
    const users = await db.collection("users").find().toArray();

    let usersWithTweets = [];

    tweets.forEach(tweet => {
      const userInformation = users.find(user => user.username === tweet.username);
      if (userInformation) {
        usersWithTweets.push({
          _id: tweet._id,
          username: tweet.username,
          avatar: userInformation.avatar,
          tweet: tweet.tweet
        });
      }
    });

    usersWithTweets.sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp());

    return res.status(200).send(usersWithTweets);

  } catch (err) {
    return res.status(500).send(err.message);
  }
})

app.delete("/tweets/:id", async (req, res) => {

  const { id } = req.params;

  try {
    const result = await db
      .collection("tweets")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send("Tweet não encontrado");
    }
    res.status(204).send("Tweet deletado com sucesso!")
  } catch (err) {
    return res.status(500).send(err.message);
  }
})

app.put("/tweets/:id", async (req, res) => {

  const { id } = req.params;
  const { tweet } = req.body;

  const validate = joi.object({
    tweet: joi.string().required()
  }).validate(req.body, { abortEarly: false });

  if (validate.error) {
    return res.status(422).send("Mensagem tweet é obrigatória");
  }

  try {
    const result = await db.collection("tweets")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { tweet: tweet } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).send("Tweet não encontrado!");
    }
    res.status(204).send("Tweet editado!")

  } catch (err) {
    res.status(500).send(err.message);
  }
})

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Rodando na porta ${port}`));