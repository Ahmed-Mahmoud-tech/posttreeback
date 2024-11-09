CREATE DATABASE posttree;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    by_google BOOLEAN DEFAULT FALSE,
    donation_link VARCHAR(255),
    description TEXT,
    image VARCHAR(255),
    work_at VARCHAR(255),
    birth_date DATE,
    friends INTEGER[], -- Assuming this is a list of user IDs (friend relationships)
    facebook VARCHAR(255),
    linkedin VARCHAR(255),
    twitter VARCHAR(255),
    instagram VARCHAR(255),
    tiktok VARCHAR(255),
    website VARCHAR(255),
    phone VARCHAR(20),
    VARCHAR(20) CHECK (status IN ('active', 'removed')) DEFAULT 'active',
    notification_moderator_create BOOLEAN DEFAULT TRUE,
    notification_moderator_edit BOOLEAN DEFAULT TRUE,
    notification_moderator_delete BOOLEAN DEFAULT TRUE,
    notification_suggest_create BOOLEAN DEFAULT TRUE,
    notification_suggest_edit BOOLEAN DEFAULT TRUE,
    notification_suggest_delete BOOLEAN DEFAULT TRUE, -- Ensure application logic prevents delete if approved
    notification_comment_on_your_post BOOLEAN DEFAULT TRUE,
    notification_react_on_your_post BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    author_user_id INTEGER NOT NULL REFERENCES users (id),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    tags VARCHAR(255)[],
    image VARCHAR(255),
    parent_post_id INTEGER REFERENCES posts (id),
    main_post INTEGER REFERENCES posts (id), 
    moderators INTEGER[] DEFAULT ARRAY[]::INTEGER[],  -- Array of user IDs as moderators
    status VARCHAR(20) CHECK (status IN ('reported', 'draft', 'published', 'pending', 'removed')) DEFAULT 'draft',
    viewers INTEGER[] DEFAULT ARRAY[]::INTEGER[],     -- Array of user IDs as viewers
    proposers INTEGER[] DEFAULT ARRAY[]::INTEGER[],   -- Array of user IDs as proposers
    sort INTEGER,
    level INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE donations ( 
    id SERIAL PRIMARY KEY, 
    from_user_id INTEGER NOT NULL,  
    to_user_id INTEGER NOT NULL, 
    on_post_id INTEGER NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 

    FOREIGN KEY (from_user_id) REFERENCES users (id), 
    FOREIGN KEY (to_user_id) REFERENCES users (id), 
    FOREIGN KEY (on_post_id) REFERENCES posts (id) 
);



 

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    author_user_id INTEGER NOT NULL REFERENCES users (id),  -- Foreign key referencing the users table
    content TEXT NOT NULL,
    post_id REFERENCES posts (id)                                   -- The text content of the comment
    replay INTEGER REFERENCES comments (id),                            -- This will refer to the post ID or comment ID
    status VARCHAR(20) CHECK (status IN ('active', 'reported', 'removed')),  -- Comment status
    type VARCHAR(20) CHECK (type IN ('comment', 'reply')),  -- Type of the entry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,         -- Timestamp for when the comment was created
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP          -- Timestamp for when the comment was last updated
);




CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL,  
    category VARCHAR(255) NOT NULL,  
    message VARCHAR(255),           
    report_on_post_id INTEGER,       
    report_on_comment_id INTEGER,    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (from_user_id) REFERENCES users (id),
    FOREIGN KEY (report_on_post_id) REFERENCES posts (id),
    FOREIGN KEY (report_on_comment_id) REFERENCES comments (id)
);



CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,                             -- Unique identifier for each notification
    author_user_id INTEGER NOT NULL,                   -- User ID of the author or system (could reference users)
    to_user_id INTEGER NOT NULL REFERENCES users (id), -- User ID of the recipient
    content TEXT NOT NULL,                              -- The text content of the notification
    is_read BOOLEAN DEFAULT FALSE,                      -- Indicates if the notification has been read
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- Timestamp for when the notification was created
);


CREATE TABLE friend_requests (
    id SERIAL PRIMARY KEY,                         -- Unique identifier for each friend request
    from_user_id INTEGER NOT NULL REFERENCES users (id),  -- ID of the user sending the request
    to_user_id INTEGER NOT NULL REFERENCES users (id),    -- ID of the user receiving the request
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Timestamp for when the friend request was created
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Timestamp for when the friend request was last updated
    status VARCHAR(20) CHECK (status IN ('accept', 'reject', 'pending')) DEFAULT 'pending',  -- Status of the request
    UNIQUE (from_user_id, to_user_id)                    -- Ensures a user can only send one request to another user
);


CREATE TABLE likes (
    id SERIAL PRIMARY KEY,                            -- Unique identifier for each like
    from_user_id INTEGER NOT NULL REFERENCES users (id),   -- The ID of the user who is liking
    like_on INTEGER NOT NULL,                          -- This will refer to either a post or a comment ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,      -- Timestamp for when the like was created
    status VARCHAR(20) CHECK (status IN ('liked', 'dislike')),  -- Whether the like is active or removed
    UNIQUE (from_user_id, like_on)                      -- Ensures a user can only like a post or comment once
);


CREATE TABLE saved (
    id SERIAL PRIMARY KEY,                         -- Unique identifier for each saved record
    user_id INTEGER NOT NULL REFERENCES users (id),  -- ID of the user who saved the post
    post_id INTEGER NOT NULL REFERENCES posts (id),  -- ID of the post that is saved
    message TEXT,                                  -- Optional message added by the user when saving the post
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp for when the post was saved
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp for when the post was saved
    UNIQUE (user_id, post_id)                       -- Ensures a user can only save a specific post once
);

CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,                            -- Unique identifier for each rating
    from_user_id INTEGER NOT NULL REFERENCES users (id),  -- ID of the user who is rating the post
    post_id INTEGER NOT NULL REFERENCES posts (id),       -- ID of the post being rated
    rate INTEGER CHECK (rate BETWEEN 0 AND 5),            -- The rating value (0 to 5)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Timestamp when the rating was created
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Timestamp when the rating was created
    UNIQUE (from_user_id, post_id)                       -- Ensures a user can only rate a post once
);

CREATE TABLE subscribe (
    id SERIAL PRIMARY KEY,                         -- Unique identifier for each subscription
    from_user_id INTEGER NOT NULL REFERENCES users (id),  -- ID of the user subscribing
    post_id INTEGER NOT NULL REFERENCES posts (id),     -- ID of the post being subscribed to
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp when the subscription was created
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp when the subscription was created
    UNIQUE (from_user_id, post_id)                  -- Ensures a user can only subscribe to a post once
);

CREATE TABLE share (
    id SERIAL PRIMARY KEY,                         -- Unique identifier for each share
    from_user_id INTEGER NOT NULL REFERENCES users (id),  -- ID of the user sharing the post
    post_id INTEGER NOT NULL REFERENCES posts (id),     -- ID of the post being shared
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp when the post was shared
    UNIQUE (from_user_id, post_id)                  -- Ensures a user can only share a specific post once
);

CREATE TABLE views (
    id SERIAL PRIMARY KEY,                         -- Unique identifier for each view
    from_user_id INTEGER NOT NULL REFERENCES users (id),  -- ID of the user who viewed the post
    post_id INTEGER NOT NULL REFERENCES posts (id),     -- ID of the post being viewed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp when the post was viewed
    UNIQUE (from_user_id, post_id)                  -- Ensures a user can only view a post once
);

CREATE TABLE groups (
    id SERIAL PRIMARY KEY,                         -- Unique identifier for each group
    owner_user_id INTEGER NOT NULL REFERENCES users (id),  -- ID of the user who is the owner of the group
    users INTEGER[] NOT NULL,                      -- Array of user IDs representing group members
    status VARCHAR(20) CHECK (status IN ('active', 'removed')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the group was created
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the group was last updated
    FOREIGN KEY (owner_user_id) REFERENCES users(id)  -- Ensure the owner is a valid user
);


/***  trigger  ***/

CREATE OR REPLACE FUNCTION update_post_status_when_user_removed() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'removed' THEN
        -- Update all posts authored by this user to 'removed'
        UPDATE posts 
        SET status = 'removed'
        WHERE author_user_id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_status_change_trigger
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_post_status_when_user_removed();


CREATE OR REPLACE FUNCTION update_comment_status_when_post_removed() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'removed' THEN
        -- Update all comments related to the removed post to 'removed'
        UPDATE comments
        SET status = 'removed'
        WHERE post_id = OLD.id  AND type = 'comment';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_status_change_trigger
AFTER UPDATE ON posts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_comment_status_when_post_removed();




CREATE OR REPLACE FUNCTION update_reply_status_when_comment_removed() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'removed' THEN
        -- Update all replies to this comment to 'removed'
        UPDATE comments
        SET status = 'removed'
        WHERE replay = OLD.id AND type = 'reply';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_status_change_trigger
AFTER UPDATE ON comments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_reply_status_when_comment_removed();

