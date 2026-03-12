FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o aura-backend ./cmd/api/main.go

FROM alpine:latest

WORKDIR /root/
RUN apk --no-cache add ca-certificates

COPY --from=builder /app/aura-backend .

COPY --from=builder /app/docs ./docs

EXPOSE 8080

CMD ["./aura-backend"]
