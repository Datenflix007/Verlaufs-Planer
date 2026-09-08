set shell := ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

default:
    just --list

install:
    npm install --legacy-peer-deps

db-ensure:
    npm run db:ensure

db-push: db-ensure
    npm run db:push

db-generate: db-ensure
    npm run db:generate

db-migrate: db-ensure
    npm run db:migrate

db-seed:
    npm run db:seed

preprocess-th:
    npm run preprocess:th

db-import-th:
    npm run db:import:th

db-import: db-import-th

bootstrap: install db-seed db-import-th
    Write-Host "Bootstrap abgeschlossen."

dev port="5173":
    npm run dev -- --host 127.0.0.1 --port {{port}}

check:
    npm run check

test:
    npm test

build:
    npm run build

verify: check test build
    Write-Host "Checks, Tests und Build abgeschlossen."

studio: db-ensure
    npm run db:studio

format:
    npm run format
