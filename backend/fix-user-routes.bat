@echo off
echo ===================================
echo MAR ABU PROJECTS SERVICES LLC
echo User Routes Fix Script
echo ===================================

echo.
echo Step 1: Backing up current schema...
copy prisma\schema.prisma prisma\schema.prisma.backup

echo.
echo Step 2: Creating migration...
call npx prisma migrate dev --name add_user_fields_and_favorites

echo.
echo Step 3: Generating Prisma Client...
call npx prisma generate

echo.
echo Step 4: Clearing TypeScript cache...
if exist dist rmdir /s /q dist
if exist .tsbuildinfo del .tsbuildinfo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo Step 5: Creating logs directory if not exists...
if not exist logs mkdir logs

echo.
echo ===================================
echo Fix applied successfully!
echo.
echo IMPORTANT: Make sure to:
echo 1. Update your constants.ts file
echo 2. Update your emailservice.ts file
echo 3. Check enum imports in your routes
echo.
echo Then run: npm run dev
echo ===================================
pause