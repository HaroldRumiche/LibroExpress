<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// API use

use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\AuthorController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\FaqController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::apiResource('books', BookController::class);
Route::apiResource('author', AuthorController::class);
Route::apiResource('purchases', PurchaseController::class);
Route::apiResource('testimonials', TestimonialController::class);
Route::apiResource('faq', FaqController::class);

//Route::get('/landing-page', [BookController::class, 'showLandingPage'])->name('landing-page');
//Route::get('/landing-page/{id}', [BookController::class, 'showLandingPageById'])->name('landing-page-by-id');
//Route::get('/landing-page/{id}/download', [BookController::class, 'downloadBook'])->name('landing-page-download');
//Route::get('/landing-page/{id}/purchase', [BookController::class, 'purchaseBook'])->name('landing-page-purchase');