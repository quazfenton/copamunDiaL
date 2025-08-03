const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/playmate';
const JWT_SECRET = process.env.JWT_SECRET || 'playmate_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['player', 'coach', 'admin'], default: 'player' },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving user
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Team Schema
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sport: { type: String, required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  formation: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Team = mongoose.model('Team', teamSchema);

// Match Schema
const matchSchema = new mongoose.Schema({
  team1: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  team2: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  score: {
    team1: { type: Number, default: 0 },
    team2: { type: Number, default: 0 }
  },
  status: { type: String, enum: ['scheduled', 'in-progress', 'completed'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now }
});

const Match = mongoose.model('Match', matchSchema);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const user = new User({ username, email, password, role });
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);
    
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// Create team
app.post('/api/teams', authenticateToken, async (req, res) => {
  try {
    const { name, sport } = req.body;
    const team = new Team({ name, sport, coach: req.user.id });
    await team.save();
    
    // Add team to user's teams array
    await User.findByIdAndUpdate(req.user.id, { $push: { teams: team._id } });
    
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating team' });
  }
});

// Get all teams for a user
app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('teams');
    res.json(user.teams);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching teams' });
  }
});

// Get specific team
app.get('/api/teams/:id', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players', 'username')
      .populate('coach', 'username');
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching team' });
  }
});

// Update team formation
app.put('/api/teams/:id/formation', authenticateToken, async (req, res) => {
  try {
    const { formation } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { formation },
      { new: true }
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ message: 'Formation updated successfully', team });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating formation' });
  }
});

// Add player to team
app.post('/api/teams/:id/players', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $push: { players: playerId } },
      { new: true }
    ).populate('players', 'username');
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Add team to player's teams array
    await User.findByIdAndUpdate(playerId, { $push: { teams: team._id } });
    
    res.json({ message: 'Player added to team successfully', team });
  } catch (error) {
    res.status(500).json({ error: 'Server error adding player to team' });
  }
});

// Create match
app.post('/api/matches', authenticateToken, async (req, res) => {
  try {
    const { team1, team2, date, location } = req.body;
    const match = new Match({ team1, team2, date, location });
    await match.save();
    
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating match' });
  }
});

// Get matches
app.get('/api/matches', authenticateToken, async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('team1', 'name')
      .populate('team2', 'name');
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching matches' });
  }
});

// Update match score
app.put('/api/matches/:id/score', authenticateToken, async (req, res) => {
  try {
    const { team1Score, team2Score } = req.body;
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { 'score.team1': team1Score, 'score.team2': team2Score },
      { new: true }
    ).populate('team1', 'name').populate('team2', 'name');
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json({ message: 'Score updated successfully', match });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating score' });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PlayMate backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});