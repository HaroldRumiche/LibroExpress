<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Purchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'book_id',
        'name',
        'email',
        'phone',
        'price_paid',
        'download_token',
        'token_expires_at',
        'is_downloaded',
        'payment_method',
        'payment_id'
    ];

    protected $casts = [
        'price_paid' => 'decimal:2',
        'token_expires_at' => 'datetime',
        'is_downloaded' => 'boolean'
    ];

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function generateDownloadToken()
    {
        $this->download_token = md5($this->id . $this->email . time());
        $this->token_expires_at = now()->addDays(3);
        $this->save();
        
        return $this->download_token;
    }
}
