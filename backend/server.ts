import express from 'express';
import cors from 'cors';
import { players, teams, matches, leagues, pickupGames } from '../lib/data';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/players', (req, res) => {
  res.json(players);
});

app.get('/api/teams', (req, res) => {
  res.json(teams);
});

app.get('/api/matches', (req, res) => {
  res.json(matches);
});

app.get('/api/leagues', (req, res) => {
  res.json(leagues);
});

app.post('/api/leagues', (req, res) => {
  const newLeague = req.body;
  newLeague.id = leagues.length + 1;
  leagues.push(newLeague);
  res.json(newLeague);
});

app.get('/api/pickup-games', (req, res) => {
    res.json(pickupGames);
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
