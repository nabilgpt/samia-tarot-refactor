# Dynamic Secret Providers System

**Report Date:** July 22, 2025
**Author:** Ultimate Project Auditor & Documentation Agent

---

### 1. Feature Overview

This document details the implementation of the **Dynamic Secret Providers** system. This system replaces the previously hardcoded provider list in the "Add New Secret" modal with a database-driven approach. This allows Super Admins to dynamically manage the list of available secret providers (e.g., OpenAI, Stripe, Google) directly from the dashboard, enhancing the platform's scalability and maintainability in line with the "zero hardcoding" policy.

### 2. Database Schema

A new table, `secret_providers`, has been added to the database to store provider information.

**Table:** `public.secret_providers`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | Unique identifier for the provider. |
| `name` | `TEXT` | Not Null, Unique | The user-friendly name (e.g., "Google Translate"). |
| `default_key`| `TEXT` | Nullable | The suggested key name (e.g., "GOOGLE_TRANSLATE_API_KEY"). |
| `category` | `TEXT` | Not Null, Default: `'API Keys'` | The default category for this provider's secrets. |
| `icon_url` | `TEXT` | Nullable | URL for the provider's logo (for future UI use). |
| `created_at` | `TIMESTAMPTZ`| Not Null, Default: `NOW()` | Timestamp of creation. |
| `updated_at` | `TIMESTAMPTZ`| Not Null, Default: `NOW()` | Timestamp of the last update. |

**Key Features:**
*   **Auditing:** The table is connected to the `audit.log_changes()` trigger, ensuring all modifications are tracked.
*   **Row Level Security (RLS):**
    *   Any `authenticated` user can `SELECT` (read) the providers, allowing them to populate UI dropdowns.
    *   Only users with the `super_admin` role can `INSERT`, `UPDATE`, or `DELETE` records.

### 3. API Endpoints

A new set of RESTful API endpoints has been created to manage the secret providers.

**Base Path:** `/api/secret-providers`

#### 3.1. List Providers
*   **Endpoint:** `GET /`
*   **Description:** Retrieves a list of all secret providers.
*   **Access:** `authenticated`
*   **Success Response (200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "uuid-goes-here",
          "name": "OpenAI",
          "default_key": "OPENAI_API_KEY",
          "category": "AI & Machine Learning",
          "icon_url": "https://openai.com/favicon.ico",
          "created_at": "...",
          "updated_at": "..."
        }
      ]
    }
    ```

#### 3.2. Create Provider
*   **Endpoint:** `POST /`
*   **Description:** Creates a new secret provider.
*   **Access:** `super_admin`
*   **Request Body:**
    ```json
    {
      "name": "New Provider Name",
      "default_key": "NEW_PROVIDER_KEY",
      "category": "New Category",
      "icon_url": "http://example.com/icon.png"
    }
    ```
*   **Success Response (201):** Returns the newly created provider object.
*   **Error Responses:**
    *   `400 Bad Request`: If `name` is missing.
    *   `409 Conflict`: If a provider with the same name already exists.

#### 3.3. Update Provider
*   **Endpoint:** `PUT /:id`
*   **Description:** Updates an existing secret provider.
*   **Access:** `super_admin`
*   **Request Body:** Same as create.
*   **Success Response (200):** Returns the updated provider object.
*   **Error Responses:**
    *   `404 Not Found`: If the provider ID does not exist.

#### 3.4. Delete Provider
*   **Endpoint:** `DELETE /:id`
*   **Description:** Deletes a secret provider.
*   **Access:** `super_admin`
*   **Success Response (204):** No content.

### 4. Next Steps

The next phase of this task is to integrate these new endpoints into the frontend `SystemSecretsTab.jsx` component. The "Add New Secret" modal needs to be updated to:
1.  Fetch the list of providers from the new `/api/secret-providers` endpoint.
2.  Populate the provider selection dropdown with this dynamic data.
3.  When a provider is selected from the dropdown, automatically populate the "Secret Key" and "Category" input fields with the `default_key` and `category` values from the selected provider. 