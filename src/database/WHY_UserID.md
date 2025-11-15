# The Architecture

- Supabase = Primary database for user authentication & user profiles
- MongoDB = Analytics database for listening patterns, recommendations, caching

## Why userId is a String (not a reference)

- The userId stores Supabase's user ID (a string/UUID like "123e4567-e89b-12d3-a456-426614174000")
- MongoDB doesn't have a direct connection to Supabase's database
- These are cross-database references, not internal MongoDB references

## MongoDB References vs Cross-Database IDs

```javascript
// ❌ This would only work if User model existed in MongoDB:
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

// ✅ This is correct for storing external IDs (from Supabase):
userId: { type: String, required: true }
```

The pattern `{ type: ObjectId, ref: 'Model' }` only works when both collections are in the same MongoDB database. Since your users are in Supabase (PostgreSQL), you just store their ID as a string for tracking purposes.
