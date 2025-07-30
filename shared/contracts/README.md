# Contracts System

## Purpose
Contracts ensure all features use consistent naming and structure.

## Rules
1. NEVER modify existing contracts
2. All features MUST use exact names from contracts
3. If you need something not in contracts, create new contract file
4. One contract file per model/service

## Structure
- `models/` - Database model contracts
- `services/` - Service method contracts

## Usage
Before coding any feature:
1. Check if contract exists
2. Use EXACT property names
3. Use EXACT method names
4. Report if contract is missing 