# Implementation Plan: Loop Mode for Audio/Video Media

## Feature Requirements
- **Setting Level**: Per test (checkbox when creating test)
- **Default**: Loop enabled by default (true)
- **Existing Tests**: Apply default (true) to all existing tests via migration
- **Media Types**: Only audio and video (not images or text)

---

## Backend Changes

### 1. Database Migration (`backend/src/db/mod.rs`)

**Add migration function** (after line 363, after `add_description_to_tests()`):

```rust
async fn add_loop_media_to_tests(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if column exists
    let has_column: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('tests')
         WHERE name = 'loop_media'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_column {
        // Add column with default value of 1 (true)
        sqlx::query("ALTER TABLE tests ADD COLUMN loop_media INTEGER NOT NULL DEFAULT 1")
            .execute(pool)
            .await?;
    }

    Ok(())
}
```

**Call migration** in `run_migrations()` (after line 107):
```rust
add_loop_media_to_tests(pool).await?;
```

---

### 2. Update Models (`backend/src/models/mod.rs`)

**Update Test struct** (line 45-53):
```rust
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Test {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub status: String,
    pub created_by: Option<String>,
    pub loop_media: bool,  // ADD THIS
}
```

**Update CreateTestRequest** (line 107-112):
```rust
#[derive(Debug, Deserialize)]
pub struct CreateTestRequest {
    pub name: String,
    pub description: Option<String>,
    pub category_id: i64,
    pub loop_media: Option<bool>,  // ADD THIS
}
```

---

### 3. Update Handler (`backend/src/handlers/tests.rs`)

**Update create_test handler** (line 17-23):

Add before the INSERT query:
```rust
let loop_media = payload.loop_media.unwrap_or(true); // Default to true
```

Update the INSERT query:
```rust
let result = sqlx::query("INSERT INTO tests (name, description, created_by, loop_media) VALUES (?, ?, ?, ?)")
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&claims.sub)
    .bind(loop_media)  // ADD THIS
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
```

Update activity log (line 49):
```rust
Some(json!({"name": payload.name, "description": payload.description, "category_id": payload.category_id, "loop_media": loop_media}))
```

---

## Frontend Changes

### 4. Update Types (`frontend/src/types/index.ts`)

**Update Test interface** (line 18-25):
```typescript
export interface Test {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  status: 'open' | 'closed';
  created_by?: string;
  loop_media: boolean;  // ADD THIS
}
```

---

### 5. Update Test Creation Form (`frontend/src/components/admin/Tests.tsx`)

**Add state** (after line 11):
```typescript
const [loopMedia, setLoopMedia] = useState(true);
```

**Add checkbox in form** (after line 197, before submit button):
```typescript
<div style={styles.checkboxContainer}>
  <label style={styles.checkboxLabel}>
    <input
      type="checkbox"
      checked={loopMedia}
      onChange={(e) => setLoopMedia(e.target.checked)}
      disabled={loading}
      style={styles.checkboxInput}
    />
    <span style={styles.checkboxText}>
      Loop audio/video media (recommended for consistent playback)
    </span>
  </label>
</div>
```

**Update API call** (line 53-57):
```typescript
await api.post('/admin/tests', {
  name: testName,
  description: testDescription.trim() || null,
  category_id: selectedCategory,
  loop_media: loopMedia,  // ADD THIS
});
```

**Reset state** (after line 59):
```typescript
setLoopMedia(true);  // ADD THIS
```

**Add styles** (at end of styles object):
```typescript
checkboxContainer: {
  padding: '0.75rem',
  backgroundColor: '#f9fafb',
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
},
checkboxLabel: {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  gap: '0.5rem',
},
checkboxInput: {
  width: '18px',
  height: '18px',
  cursor: 'pointer',
  accentColor: '#3b82f6',
},
checkboxText: {
  fontSize: '0.875rem',
  color: '#374151',
  lineHeight: '1.5',
},
```

---

### 6. Update MediaPlayer (`frontend/src/components/user/MediaPlayer.tsx`)

**Update interface** (line 5-7):
```typescript
interface MediaPlayerProps {
  media: MediaFile;
  loop?: boolean;  // ADD THIS
}
```

**Update component signature** (line 9):
```typescript
export default function MediaPlayer({ media, loop = false }: MediaPlayerProps) {
```

**Update audio element** (line 73):
```typescript
<audio ref={audioRef} key={media.id} controls loop={loop} style={styles.media}>
```

**Update video element** (line 81):
```typescript
<video ref={videoRef} key={media.id} controls loop={loop} style={styles.media}>
```

---

### 7. Update UserTest (`frontend/src/pages/UserTest.tsx`)

**Pass loop prop** (line 216):
```typescript
<MediaPlayer
  media={currentMedia}
  loop={testData.test.loop_media}
/>
```

---

## Data Flow

1. **Test Creation (Admin)**:
   - Admin checks/unchecks "Loop media" checkbox (default: checked)
   - On submit, `loop_media: boolean` sent to backend

2. **Backend Storage**:
   - Handler receives `loop_media` in CreateTestRequest
   - Stores as INTEGER (0 or 1) in SQLite
   - Returns Test object with `loop_media: bool`

3. **Test Retrieval (User)**:
   - User accesses test via token
   - Backend fetches test with `loop_media` field
   - Sent to frontend in TestDetailsResponse

4. **Media Playback**:
   - UserTest.tsx passes `loop_media` to MediaPlayer
   - MediaPlayer adds `loop={loop}` to `<audio>` and `<video>` elements
   - Browser handles looping automatically
   - Images and text NOT affected

---

## Implementation Order

1. **Backend** (deploy first):
   - Database migration
   - Model updates
   - Handler updates
   - Run backend (migration executes automatically)

2. **Frontend** (deploy second):
   - Type definitions
   - Admin form
   - MediaPlayer component
   - UserTest page

---

## Migration Considerations

- **Backward Compatibility**: ✅
  - DEFAULT value of 1 (true) applied to all existing tests
  - No data loss or breaking changes

- **Safety**: ✅
  - Idempotent migration (checks if column exists)
  - Safe to run multiple times

---

## Testing Checklist

- [ ] Create new test with loop enabled (default)
- [ ] Create new test with loop disabled
- [ ] Verify existing tests have loop enabled
- [ ] Test audio playback with loop on/off
- [ ] Test video playback with loop on/off
- [ ] Verify images are NOT affected
- [ ] Verify text files are NOT affected
- [ ] Test on mobile devices

---

## Files Modified

### Backend (3 files):
1. `backend/src/db/mod.rs` - Migration
2. `backend/src/models/mod.rs` - Structs
3. `backend/src/handlers/tests.rs` - Create handler

### Frontend (4 files):
1. `frontend/src/types/index.ts` - TypeScript interface
2. `frontend/src/components/admin/Tests.tsx` - Admin form
3. `frontend/src/components/user/MediaPlayer.tsx` - Loop support
4. `frontend/src/pages/UserTest.tsx` - Pass loop prop

---

## HTML5 Loop Attribute

The `loop` boolean attribute on `<audio>` and `<video>` elements causes media to automatically restart from the beginning when it reaches the end.

**Usage:**
```jsx
<audio controls loop={true}>...</audio>
<video controls loop={false}>...</video>
```

Supported by all modern browsers.
