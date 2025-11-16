/*
  # Sweet Shop Management System - Initial Schema

  ## Overview
  This migration creates the core database structure for a sweet shop management system
  with user authentication and inventory management capabilities.

  ## New Tables

  ### 1. profiles
  Extends auth.users with additional profile information
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `is_admin` (boolean) - Admin role flag, defaults to false
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. sweets
  Manages the sweet inventory
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Sweet name
  - `category` (text) - Category (e.g., chocolate, candy, gummy)
  - `price` (numeric) - Price in decimal format
  - `quantity` (integer) - Current stock quantity
  - `description` (text) - Optional sweet description
  - `image_url` (text) - Optional image URL
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. transactions
  Tracks all purchase and restock transactions
  - `id` (uuid, primary key) - Unique identifier
  - `sweet_id` (uuid) - References sweets table
  - `user_id` (uuid) - References auth.users
  - `transaction_type` (text) - Either 'purchase' or 'restock'
  - `quantity` (integer) - Number of items in transaction
  - `created_at` (timestamptz) - Transaction timestamp

  ## Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - profiles: Users can read all profiles, but only update their own
  - sweets: All authenticated users can read, only admins can modify
  - transactions: Users can read their own transactions, admins can read all

  ## Notes
  - The is_admin flag on profiles determines authorization for admin-only operations
  - All monetary values use numeric type for precision
  - Transactions table provides full audit trail of inventory changes
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  is_admin boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create sweets table
CREATE TABLE IF NOT EXISTS sweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  description text DEFAULT '',
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sweets"
  ON sweets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sweets"
  ON sweets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update sweets"
  ON sweets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete sweets"
  ON sweets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sweet_id uuid NOT NULL REFERENCES sweets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'restock')),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to sweets table
DROP TRIGGER IF EXISTS update_sweets_updated_at ON sweets;
CREATE TRIGGER update_sweets_updated_at
  BEFORE UPDATE ON sweets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
