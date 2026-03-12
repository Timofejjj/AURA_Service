postgres:
	docker run --name postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=psql -d postgres

createdb:
	docker exec -it postgres createdb --username=postgres --owner=postgres bank

dropdb:
	docker exec -it postgres dropdb -U postgres bank

migrateup:
	migrate -path "internal/database/migrations" -database "postgresql://postgres:psql@localhost:5432/postgres?sslmode=disable" -verbose up

migratedown:
	migrate -path "internal/database/migrations" -database "postgresql://postgres:psql@localhost:5432/postgres?sslmode=disable" -verbose down

start:
	docker start postgres