<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Faq extends Model
{
    use HasFactory;

    protected $fillable = [
        'book_id',
        'question',
        'answer',
        'order'
    ];

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }
}
