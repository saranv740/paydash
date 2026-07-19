# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the statically-linked Go binary
RUN go build -o paydash-api ./cmd/api

# Final run stage
FROM alpine:3.21

# Install runtime dependencies and add a non-root user
RUN apk --no-cache add ca-certificates && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

# Run as non-root user for security
USER appuser

WORKDIR /app

# Copy the binary from the build stage
COPY --from=builder /app/paydash-api .

# Expose port 3000 (the default port for cmd/api)
EXPOSE 3000

# Start the application
CMD ["./paydash-api"]
