require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// API POST /api/journal
app.post('/api/journal', (req, res) => {
    const { userId, ambience, text, emotion, keywords, summary } = req.body;
    
    if (!userId || !ambience || !text) {
        return res.status(400).json({ error: 'userId, ambience, and text are required' });
    }

    const keywordsJson = keywords ? JSON.stringify(keywords) : null;

    const query = `INSERT INTO entries (userId, ambience, text, emotion, keywords, summary)
                   VALUES (?, ?, ?, ?, ?, ?)`;
                   
    db.run(query, [userId, ambience, text, emotion, keywordsJson, summary], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Journal entry created' });
    });
});

// API GET /api/journal/:userId
app.get('/api/journal/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.all(`SELECT * FROM entries WHERE userId = ? ORDER BY createdAt DESC`, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const entries = rows.map(row => ({
            ...row,
            keywords: row.keywords ? JSON.parse(row.keywords) : []
        }));
        
        res.json(entries);
    });
});

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// LRU Cache for analysis
const analysisCache = new Map();
const CACHE_LIMIT = 1000;

// API POST /api/journal/analyze
app.post('/api/journal/analyze', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    // Simple cache check
    if (analysisCache.has(text)) {
        console.log('Cache hit for analysis');
        const cachedResult = analysisCache.get(text);
        analysisCache.delete(text);
        analysisCache.set(text, cachedResult);
        return res.json(cachedResult);
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are an emotional analysis assistant for a nature wellness app. Analyze journal entries and respond ONLY with a JSON object in this exact format:
{
  "emotion": "<single primary emotion word>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "summary": "<one sentence summary of the user's experience>"
}`
                },
                {
                    role: 'user',
                    content: `Analyze this journal entry written after a nature session:\n\n${text}`
                }
            ]
        });

        const responseText = chatCompletion.choices[0]?.message?.content;
        const parsedData = JSON.parse(responseText);

        // Cache the result (LRU eviction)
        if (analysisCache.size >= CACHE_LIMIT) {
            const firstKey = analysisCache.keys().next().value;
            analysisCache.delete(firstKey);
        }
        analysisCache.set(text, parsedData);

        res.json(parsedData);
    } catch (error) {
        console.error('LLM Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze journal entry' });
    }
});

// API GET /api/journal/insights/:userId
app.get('/api/journal/insights/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.all(`SELECT * FROM entries WHERE userId = ? ORDER BY createdAt DESC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (rows.length === 0) {
            return res.json({
                totalEntries: 0,
                topEmotion: null,
                mostUsedAmbience: null,
                recentKeywords: []
            });
        }

        const stats = {
            totalEntries: rows.length,
            emotions: {},
            ambiences: {},
        };

        const allKeywords = [];

        rows.forEach((row, index) => {
            if (row.emotion) {
                stats.emotions[row.emotion] = (stats.emotions[row.emotion] || 0) + 1;
            }
            if (row.ambience) {
                stats.ambiences[row.ambience] = (stats.ambiences[row.ambience] || 0) + 1;
            }
            // Add keywords to array
            if (row.keywords) {
                try {
                    const kws = JSON.parse(row.keywords);
                    allKeywords.push(...kws);
                } catch(e) {}
            }
        });

        const topEmotion = Object.keys(stats.emotions).sort((a,b) => stats.emotions[b] - stats.emotions[a])[0] || null;
        const mostUsedAmbience = Object.keys(stats.ambiences).sort((a,b) => stats.ambiences[b] - stats.ambiences[a])[0] || null;
        
        // Remove duplicates and limit to top ~5-10
        const uniqueKeywords = [...new Set(allKeywords)].slice(0, 10);

        res.json({
            totalEntries: stats.totalEntries,
            topEmotion,
            mostUsedAmbience,
            recentKeywords: uniqueKeywords
        });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
