# PDF Generation Issue

## Problem
The `pdf_url` field is returning `"{}"` instead of the actual PDF URL.

## Root Cause
The PDF generation might be failing silently, or the URL is not being properly saved to the database.

## Solution
1. Add better error logging
2. Ensure PDF generation is actually being triggered
3. Fix the PDF URL storage

## Steps to Fix
1. Check if PDFs exist in Supabase storage bucket 'pdfs'
2. Add manual PDF generation endpoint
3. Fix the pdf_url field to return proper URL or null
