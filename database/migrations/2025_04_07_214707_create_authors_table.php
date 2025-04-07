<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('authors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('bio');
            $table->string('image')->nullable();
            $table->timestamps();
        });

        // Agregar relación con la tabla books
        Schema::table('books', function (Blueprint $table) {
            $table->foreignId('author_id')->constrained();
        });
    }

    public function down()
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropForeign(['author_id']);
        });
        Schema::dropIfExists('authors');
    }
};
