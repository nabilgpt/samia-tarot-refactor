<?php
/**
 * reCAPTCHA Verification Script for SAMIA TAROT
 * This script verifies reCAPTCHA tokens on the server side
 */

// Enable CORS for frontend requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ]);
    exit();
}

// reCAPTCHA configuration
$RECAPTCHA_SECRET_KEY = '6LfwzksrAAAAAAx_w7utBIM572cyg3bDMj10yVw2';
$RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!isset($input['token']) || empty($input['token'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'reCAPTCHA token is required'
    ]);
    exit();
}

$recaptcha_token = $input['token'];
$user_ip = $_SERVER['REMOTE_ADDR'] ?? '';

// Prepare verification data
$verification_data = [
    'secret' => $RECAPTCHA_SECRET_KEY,
    'response' => $recaptcha_token,
    'remoteip' => $user_ip
];

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $RECAPTCHA_VERIFY_URL);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($verification_data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// Handle cURL errors
if ($curl_error) {
    error_log("reCAPTCHA cURL Error: " . $curl_error);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Verification service unavailable'
    ]);
    exit();
}

// Handle HTTP errors
if ($http_code !== 200) {
    error_log("reCAPTCHA HTTP Error: " . $http_code);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Verification service error'
    ]);
    exit();
}

// Parse Google's response
$google_response = json_decode($response, true);

if ($google_response === null) {
    error_log("reCAPTCHA JSON Parse Error: " . json_last_error_msg());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid verification response'
    ]);
    exit();
}

// Log verification attempt (optional)
$log_data = [
    'timestamp' => date('Y-m-d H:i:s'),
    'ip' => $user_ip,
    'success' => $google_response['success'] ?? false,
    'score' => $google_response['score'] ?? null,
    'action' => $google_response['action'] ?? null,
    'error_codes' => $google_response['error-codes'] ?? []
];

// Log to file (optional - remove in production or use proper logging)
// file_put_contents('recaptcha_logs.json', json_encode($log_data) . "\n", FILE_APPEND);

// Check verification result
if ($google_response['success']) {
    // Additional security checks for reCAPTCHA v3 (if using v3)
    if (isset($google_response['score'])) {
        $min_score = 0.5; // Adjust threshold as needed
        if ($google_response['score'] < $min_score) {
            echo json_encode([
                'success' => false,
                'error' => 'Low confidence score',
                'score' => $google_response['score']
            ]);
            exit();
        }
    }

    // Verification successful
    echo json_encode([
        'success' => true,
        'message' => 'reCAPTCHA verification successful',
        'score' => $google_response['score'] ?? null,
        'timestamp' => date('c')
    ]);
} else {
    // Verification failed
    $error_codes = $google_response['error-codes'] ?? [];
    $error_message = 'reCAPTCHA verification failed';
    
    // Map error codes to user-friendly messages
    $error_messages = [
        'missing-input-secret' => 'Server configuration error',
        'invalid-input-secret' => 'Server configuration error',
        'missing-input-response' => 'Please complete the reCAPTCHA',
        'invalid-input-response' => 'Invalid reCAPTCHA response',
        'bad-request' => 'Invalid request format',
        'timeout-or-duplicate' => 'reCAPTCHA expired or already used'
    ];
    
    if (!empty($error_codes)) {
        foreach ($error_codes as $code) {
            if (isset($error_messages[$code])) {
                $error_message = $error_messages[$code];
                break;
            }
        }
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $error_message,
        'error_codes' => $error_codes
    ]);
}

/**
 * Additional utility functions
 */

// Function to validate IP address
function isValidIP($ip) {
    return filter_var($ip, FILTER_VALIDATE_IP) !== false;
}

// Function to get real IP address
function getRealIP() {
    $ip_keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    
    foreach ($ip_keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ips = explode(',', $_SERVER[$key]);
            $ip = trim($ips[0]);
            if (isValidIP($ip)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

// Function to rate limit requests (basic implementation)
function checkRateLimit($ip, $max_requests = 10, $time_window = 300) {
    $cache_file = sys_get_temp_dir() . '/recaptcha_rate_limit.json';
    $current_time = time();
    
    // Load existing data
    $rate_data = [];
    if (file_exists($cache_file)) {
        $rate_data = json_decode(file_get_contents($cache_file), true) ?: [];
    }
    
    // Clean old entries
    foreach ($rate_data as $stored_ip => $data) {
        if ($current_time - $data['first_request'] > $time_window) {
            unset($rate_data[$stored_ip]);
        }
    }
    
    // Check current IP
    if (!isset($rate_data[$ip])) {
        $rate_data[$ip] = [
            'count' => 1,
            'first_request' => $current_time
        ];
    } else {
        $rate_data[$ip]['count']++;
    }
    
    // Save data
    file_put_contents($cache_file, json_encode($rate_data));
    
    // Check if limit exceeded
    return $rate_data[$ip]['count'] <= $max_requests;
}

?> 