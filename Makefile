# -------- DEV --------
dev:
	docker compose -f docker-compose.dev.yml -p jearn-dev up -d

dev-build:
	docker compose -f docker-compose.dev.yml -p jearn-dev up -d --build

dev-restart:
	docker compose -f docker-compose.dev.yml -p jearn-dev restart

dev-down:
	docker compose -f docker-compose.dev.yml -p jearn-dev down


# -------- PROD --------
prod:
	docker compose -f docker-compose.prod.yml -p jearn-prod up -d

prod-build:
	docker compose -f docker-compose.prod.yml -p jearn-prod up -d --build
#docker compose -f docker-compose.prod.yml -p jearn-prod down
#docker compose -f docker-compose.prod.yml -p jearn-prod build --no-cache
#docker compose -f docker-compose.prod.yml -p jearn-prod up -d

prod-restart:
	docker compose -f docker-compose.prod.yml -p jearn-prod restart

prod-down:
	docker compose -f docker-compose.prod.yml -p jearn-prod down


# -------- LOGS --------
logs-dev:
	docker compose -f docker-compose.dev.yml -p jearn-dev logs -f

logs-prod:
	docker compose -f docker-compose.prod.yml -p jearn-prod logs -f


# -------- CLEAN --------
clean:
	docker rm -f $$(docker ps -aq) || true
	docker network prune -f