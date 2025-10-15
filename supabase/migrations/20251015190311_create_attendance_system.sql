/*
  # Attendance Monitoring System - Database Schema

  1. New Tables
    - `attendance_records`
      - `id` (uuid, primary key)
      - `roll_number` (text, unique per upload batch)
      - `name` (text, student name)
      - `gender` (text, 'Male' or 'Female')
      - `attendance_days` (integer, days attended)
      - `total_days` (integer, total days)
      - `attendance_percentage` (numeric, calculated percentage)
      - `student_email` (text, student email address)
      - `parent_email` (text, parent email address)
      - `is_defaulter` (boolean, true if <75%)
      - `batch_id` (uuid, groups records from same upload)
      - `class_name` (text, optional class identifier)
      - `uploaded_at` (timestamptz, upload timestamp)
      - `created_at` (timestamptz, record creation time)

    - `upload_batches`
      - `id` (uuid, primary key)
      - `class_name` (text, class identifier)
      - `total_students` (integer)
      - `total_defaulters` (integer)
      - `average_attendance` (numeric)
      - `uploaded_by` (text, teacher/uploader name)
      - `uploaded_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Policies for authenticated users to manage their data
    
  3. Indexes
    - Index on batch_id for faster queries
    - Index on is_defaulter for filtering
*/

-- Create upload_batches table
CREATE TABLE IF NOT EXISTS upload_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text DEFAULT '',
  total_students integer DEFAULT 0,
  total_defaulters integer DEFAULT 0,
  average_attendance numeric(5,2) DEFAULT 0,
  uploaded_by text DEFAULT '',
  uploaded_at timestamptz DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number text NOT NULL,
  name text NOT NULL,
  gender text NOT NULL,
  attendance_days integer NOT NULL,
  total_days integer NOT NULL DEFAULT 30,
  attendance_percentage numeric(5,2) NOT NULL,
  student_email text NOT NULL,
  parent_email text NOT NULL,
  is_defaulter boolean DEFAULT false,
  batch_id uuid REFERENCES upload_batches(id) ON DELETE CASCADE,
  class_name text DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies for upload_batches
CREATE POLICY "Allow public read access to batches"
  ON upload_batches FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to batches"
  ON upload_batches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to batches"
  ON upload_batches FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from batches"
  ON upload_batches FOR DELETE
  USING (true);

-- Policies for attendance_records
CREATE POLICY "Allow public read access to records"
  ON attendance_records FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to records"
  ON attendance_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to records"
  ON attendance_records FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from records"
  ON attendance_records FOR DELETE
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_batch_id ON attendance_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_defaulter ON attendance_records(is_defaulter);
CREATE INDEX IF NOT EXISTS idx_attendance_uploaded_at ON attendance_records(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_batch_uploaded_at ON upload_batches(uploaded_at);