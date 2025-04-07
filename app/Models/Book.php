<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Book extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'subtitle',
        'description',
        'price',
        'cover_image',
        'features',
        'author_id'
    ];

    protected $casts = [
        'features' => 'array',
        'price' => 'decimal:2'
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class);
    }

    public function testimonials(): HasMany
    {
        return $this->hasMany(Testimonial::class);
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(Faq::class)->orderBy('order');
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }
}