# Digital Hero — API Specification

This document details all implemented HTTP endpoints on the Digital Hero backend Express server.

* **Base URL**: `http://localhost:5000/api` (Local) / `/api` (Production)
* **Default Content-Type**: `application/json`

---

## 1. System & Health Endpoints

### `GET /api/health`
Checks API service responsiveness and active database connection pool health.

* **Authentication**: None
* **Role Requirement**: None
* **Request Body**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "server": "ok",
    "database": "connected"
  }
  ```
* **Degraded Response (HTTP 503)**:
  ```json
  {
    "success": false,
    "server": "ok",
    "database": "disconnected"
  }
  ```

---

### `GET /` and `GET /api`
Root informational ping returning uptime and service metadata.

* **Authentication**: None
* **Role Requirement**: None
* **Request Body**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "service": "Digital Hero API",
    "uptime": 45.2,
    "timestamp": "2026-09-21T14:15:00.000Z"
  }
  ```

---

## 2. Authentication & Profile Endpoints

### `GET /api/auth/me`
Fetches the profile and authoritative database role of the currently authenticated user.

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: None (`visitor`, `subscriber`, or `admin`)
* **Request Body**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "54b5cd62-0e07-4ab7-a536-f56bdaaeaae6",
      "email": "user@example.com",
      "name": "Jane Doe",
      "role": "visitor"
    }
  }
  ```
* **Error Responses**:
  * **HTTP 401 Unauthorized** (Missing Token):
    ```json
    {
      "success": false,
      "code": "AUTH_REQUIRED",
      "message": "Authentication required"
    }
    ```
  * **HTTP 401 Unauthorized** (Expired or Invalid Token):
    ```json
    {
      "success": false,
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid or expired authentication token"
    }
    ```

---

## 3. Authorization Gateway Verification Endpoints

These endpoints exist to verify RBAC enforcement across integration tests and client verification.

### `GET /api/auth/test/authenticated`
Verifies that the caller has a valid authentication session regardless of role.

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: Any authenticated role
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Authenticated access granted",
    "user": {
      "id": "54b5cd62-0e07-4ab7-a536-f56bdaaeaae6",
      "email": "user@example.com",
      "role": "visitor"
    }
  }
  ```
* **Error Response (HTTP 401)**: Missing or invalid token.

---

### `GET /api/auth/test/subscriber`
Verifies that the caller holds at least the `subscriber` role (accessible to `subscriber` and `admin`).

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: `subscriber` or `admin`
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Subscriber access granted",
    "user": {
      "id": "54b5cd62-0e07-4ab7-a536-f56bdaaeaae6",
      "email": "subscriber@example.com",
      "role": "subscriber"
    }
  }
  ```
* **Error Responses**:
  * **HTTP 401 Unauthorized**: Unauthenticated request.
  * **HTTP 403 Forbidden** (When role is `visitor`):
    ```json
    {
      "success": false,
      "message": "Insufficient permissions"
    }
    ```

---

### `GET /api/auth/test/admin`
Verifies that the caller holds the `admin` role.

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: `admin`
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Admin access granted",
    "user": {
      "id": "461c575e-1692-4545-8e26-ca34e1cf2348",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
  ```
* **Error Responses**:
  * **HTTP 401 Unauthorized**: Unauthenticated request.
  * **HTTP 403 Forbidden** (When role is `visitor` or `subscriber`):
    ```json
    {
      "success": false,
      "message": "Insufficient permissions"
    }
    ```
