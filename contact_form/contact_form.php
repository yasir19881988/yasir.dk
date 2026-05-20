<?php

// configure
$from = 'noreply@yasir.dk';
$sendTo = 'yasir@yasir.dk';
$subject = 'New message from contact form';
$fields = array('name' => 'Name', 'email' => 'Email', 'subject' => 'Subject', 'message' => 'Message'); // array variable name => Text to appear in the email. If you added or deleted a field in the contact form, edit this array.
$okMessage = 'Contact form successfully submitted. Thank you, I will get back to you soon!';
$errorMessage = 'There was an error while submitting the form. Please try again later';

// send form without reCAPTCHA
try {
    $senderEmail = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $mailFrom = $senderEmail ? $senderEmail : $from;
    $replyTo = $senderEmail ? $senderEmail : $from;

    $emailText = nl2br("You have new message from Contact Form\n");
    foreach ($fields as $key => $label) {
        $value = trim((string)($_POST[$key] ?? ''));
        if ($value !== '') {
            $emailText .= nl2br($label . ': ' . $value . "\n");
        }
    }

    $headers = array(
        'Content-Type: text/html; charset="UTF-8";',
        'From: ' . $mailFrom,
        'Reply-To: ' . $replyTo,
        'Return-Path: ' . $from,
    );

    mail($sendTo, $subject, $emailText, implode("\n", $headers));
    $responseArray = array('type' => 'success', 'message' => $okMessage);
} catch (\Throwable $e) {
    $responseArray = array('type' => 'danger', 'message' => $errorMessage);
}

if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
    header('Content-Type: application/json');
    echo json_encode($responseArray);
} else {
    echo $responseArray['message'];
}

