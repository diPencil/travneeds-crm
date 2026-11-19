ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_gender ENUM('male', 'female') NOT NULL DEFAULT 'male';
