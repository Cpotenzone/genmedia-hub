FROM golang:1.25-alpine AS builder
WORKDIR /app
ENV GOTOOLCHAIN=auto
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /mcp-nanobanana .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /mcp-nanobanana /mcp-nanobanana
ENV TRANSPORT=http
ENV PORT=8080
EXPOSE 8080
CMD ["/mcp-nanobanana"]
