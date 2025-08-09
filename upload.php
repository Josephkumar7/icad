<?php
// upload.php - simple file upload handler for Hostinger

// Allow from any origin for testing, adjust for production
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// Corrected: Relative to current script location
$uploadDir = __DIR__ . '/uploads/';

// Create uploads directory if not exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'File upload error: ' . $file['error']]);
        exit;
    }

    // Sanitize filename
    $filename = basename($file['name']);
    $filename = preg_replace("/[^A-Za-z0-9_\-\.]/", '_', $filename);

    // Generate unique filename
    $finalFilename = time() . '_' . $filename;
    $targetFile = $uploadDir . $finalFilename;

    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        // Correct public URL
        $publicUrlBase = "https://nexapay.me/apps/icad/uploads/";
        $publicUrl = $publicUrlBase . $finalFilename;

        echo json_encode(['url' => $publicUrl]);
        exit;
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to move uploaded file']);
        exit;
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
?>
