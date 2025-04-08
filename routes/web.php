<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('product/index' , function(){
        return Inertia::render('product/Index');
    })->name('product/index');

    Route::get('author/index' , function(){
        return Inertia::render('author/Index');
    })->name('author/index');

    Route::get('books/index' , function(){
        return Inertia::render('books/Index');
    })->name('books/index');

    Route::get('books/create' , function(){
        return Inertia::render('books/Create');
    })->name('books/create');

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
