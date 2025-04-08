<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\AuthorController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\FaqController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Recursos principales
Route::apiResource('books', BookController::class);
Route::apiResource('author', AuthorController::class);
Route::apiResource('purchases', PurchaseController::class);
Route::apiResource('testimonials', TestimonialController::class);
Route::apiResource('faq', FaqController::class);

// Rutas adicionales
Route::get('/landing-page', [BookController::class, 'getLandingPageData'])->name('landing-page');
Route::get('/download/{token}', [BookController::class, 'downloadBook'])->name('download.book');
