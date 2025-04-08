<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\Purchase;
use App\Models\Book;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class PurchaseController extends Controller
{
    /**
     * Listado de compras, opcionalmente filtradas por libro
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $bookFilter = $request->input('book_filter');
        
        if ($bookFilter) {
            $purchases = Purchase::with('book')
                ->where('book_id', $bookFilter)
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            $purchases = Purchase::with('book')
                ->orderBy('created_at', 'desc')
                ->get();
        }
        
        return response()->json($purchases);
    }

    /**
     * Crear una nueva compra
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'book_id' => 'required|exists:books,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'price_paid' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|max:255',
            'payment_id' => 'nullable|string|max:255',
        ]);

        // Set default values
        $validated['is_downloaded'] = false;
        
        // Create purchase
        $purchase = Purchase::create($validated);
        
        // Generate download token
        $token = $purchase->generateDownloadToken();
        
        // Load the book relationship for the response
        $purchase->load('book');
        
        return response()->json([
            'success' => true,
            'purchase' => $purchase,
            'download_token' => $token
        ], 201);
    }

    /**
     * Mostrar una compra específica (con su libro)
     *
     * @param \App\Models\Purchase $purchase
     * @return \Illuminate\Http\Response
     */
    public function show(Purchase $purchase)
    {
        $purchase->load('book');
        return response()->json($purchase);
    }

    /**
     * Actualizar una compra existente
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Purchase $purchase
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Purchase $purchase)
    {
        $validated = $request->validate([
            'book_id' => 'required|exists:books,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'price_paid' => 'required|numeric|min:0',
            'is_downloaded' => 'boolean',
            'payment_method' => 'nullable|string|max:255',
            'payment_id' => 'nullable|string|max:255',
        ]);

        $purchase->update($validated);
        
        // Load the book relationship for the response
        $purchase->load('book');

        return response()->json($purchase);
    }

    /**
     * Eliminar una compra
     *
     * @param \App\Models\Purchase $purchase
     * @return \Illuminate\Http\Response
     */
    public function destroy(Purchase $purchase)
    {
        $purchase->delete();
        return response()->json(null, 204);
    }
    
    /**
     * Descargar el libro comprado
     *
     * @param string $token
     * @return \Illuminate\Http\Response
     */
    public function download($token)
    {
        $purchase = Purchase::where('download_token', $token)
            ->where('token_expires_at', '>', now())
            ->first();
            
        if (!$purchase) {
            return response()->json([
                'success' => false, 
                'message' => 'Invalid or expired download token.'
            ], 404);
        }
        
        $book = $purchase->book;
        
        // Mark purchase as downloaded
        $purchase->update(['is_downloaded' => true]);
        
        // Check if book file exists
        $filePath = storage_path("app/books/{$book->id}/digital-book.pdf");
        
        if (!file_exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'The book file is not available at this moment.'
            ], 404);
        }
        
        // Return the file for download
        return response()->download(
            $filePath, 
            $book->title . '.pdf', 
            ['Content-Type' => 'application/pdf']
        );
    }
    
    /**
     * Preparar la página de pago para un libro
     *
     * @param \App\Models\Book $book
     * @return \Illuminate\Http\Response
     */
    public function checkout(Book $book)
    {
        return response()->json([
            'success' => true,
            'book' => $book
        ]);
    }
    
    /**
     * Procesar el pago de un libro
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Book $book
     * @return \Illuminate\Http\Response
     */
    public function processPayment(Request $request, Book $book)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'payment_method' => 'required|string|in:mercado_pago,whatsapp,manual',
        ]);
        
        // Crear registro de compra
        $purchase = Purchase::create([
            'book_id' => $book->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'price_paid' => $book->price,
            'payment_method' => $validated['payment_method'],
            'payment_id' => 'manual-' . time(),
            'is_downloaded' => false,
        ]);
        
        // Generar token de descarga
        $token = $purchase->generateDownloadToken();
        
        return response()->json([
            'success' => true,
            'message' => 'Purchase completed successfully.',
            'purchase' => $purchase,
            'download_token' => $token,
            'download_url' => route('download.book', ['token' => $token])
        ]);
    }
    
    /**
     * Regenerar el token de descarga para una compra
     *
     * @param \App\Models\Purchase $purchase
     * @return \Illuminate\Http\Response
     */
    public function regenerateToken(Purchase $purchase)
    {
        $token = $purchase->generateDownloadToken();
        
        return response()->json([
            'success' => true,
            'message' => 'Download token regenerated successfully.',
            'purchase' => $purchase,
            'download_token' => $token,
            'download_url' => route('download.book', ['token' => $token])
        ]);
    }
    
    /**
     * Obtener estadísticas de compras
     *
     * @return \Illuminate\Http\Response
     */
    public function statistics()
    {
        $totalPurchases = Purchase::count();
        $totalRevenue = Purchase::sum('price_paid');
        $totalDownloads = Purchase::where('is_downloaded', true)->count();
        
        $purchasesByBook = Purchase::selectRaw('book_id, COUNT(*) as count, SUM(price_paid) as revenue')
            ->groupBy('book_id')
            ->with('book:id,title')
            ->get();
            
        $recentPurchases = Purchase::with('book:id,title')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
            
        return response()->json([
            'total_purchases' => $totalPurchases,
            'total_revenue' => $totalRevenue,
            'total_downloads' => $totalDownloads,
            'purchases_by_book' => $purchasesByBook,
            'recent_purchases' => $recentPurchases
        ]);
    }
}