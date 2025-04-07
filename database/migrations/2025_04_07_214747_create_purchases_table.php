<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->decimal('price_paid', 8, 2);
            $table->string('download_token')->unique();
            $table->timestamp('token_expires_at');
            $table->boolean('is_downloaded')->default(false);
            $table->string('payment_method')->nullable();
            $table->string('payment_id')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('purchases');
    }
};