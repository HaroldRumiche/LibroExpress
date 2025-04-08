<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\Book;
use App\Models\Author;
use App\Models\Faq;
use App\Models\Testimonial;
use App\Models\Purchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class BookController extends Controller
{
    /**
     * Get book data for landing page
     * 
     * @return \Illuminate\Http\Response
     */
    public function getLandingPageData(Request $request)
    {
        // Obtener el libro principal para la landing page
        $book = Book::with(['author', 'testimonials', 'faqs'])
            ->first();
            
        // Si no hay libro, devolver error 404
        if (!$book) {
            return response()->json([
                'success' => false,
                'message' => 'No books found'
            ], 404);
        }
        
        // Formatear los datos para la respuesta
        $formattedBook = [
            'id' => $book->id,
            'title' => $book->title,
            'subtitle' => $book->subtitle,
            'description' => $book->description,
            'price' => $book->price,
            'cover_image' => $book->cover_image,
            'features' => $book->features,
            'author' => [
                'name' => $book->author->name,
                'bio' => $book->author->bio,
                'image' => $book->author->image,
            ],
            'testimonials' => $book->testimonials->map(function ($testimonial) {
                return [
                    'name' => $testimonial->name,
                    'text' => $testimonial->text,
                    'rating' => $testimonial->rating,
                ];
            }),
            'faqs' => $book->faqs->map(function ($faq) {
                return [
                    'question' => $faq->question,
                    'answer' => $faq->answer,
                ];
            }),
        ];
        
        return response()->json([
            'success' => true,
            'book' => $formattedBook
        ]);
    }
    
    /**
     * Listado de libros, opcionalmente filtrados por autor
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $authorFilter = $request->input('author_filter');
        
        if ($authorFilter) {
            $books = Book::with(['author', 'testimonials', 'faqs'])
                ->where('author_id', $authorFilter)
                ->get();
        } else {
            $books = Book::with(['author', 'testimonials', 'faqs'])
                ->get();
        }
        
        return response()->json($books);
    }
    
    /**
     * Mostrar un libro específico (con sus relaciones)
     * 
     * @param \App\Models\Book $book
     * @return \Illuminate\Http\Response
     */
    public function show(Book $book)
    {
        $book->load(['author', 'testimonials', 'faqs']);
        return response()->json($book);
    }
    
    /**
     * Crear un libro nuevo
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'author_id' => 'required|exists:authors,id',
            'cover_image' => 'nullable|image|max:2048',
            'features' => 'nullable|array',
        ]);
        
        if ($request->hasFile('cover_image')) {
            $path = $request->file('cover_image')->store('books/covers', 'public');
            $validated['cover_image'] = $path;
        } else {
            $validated['cover_image'] = null;
        }
        
        $book = Book::create($validated);
        
        // Cargar las relaciones para la respuesta
        $book->load(['author', 'testimonials', 'faqs']);
        
        return response()->json($book, 201);
    }
    
    /**
     * Actualizar un libro existente
     * 
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Book $book
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Book $book)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'author_id' => 'required|exists:authors,id',
            'cover_image' => 'nullable|image|max:2048',
            'features' => 'nullable|array',
        ]);
        
        if ($request->hasFile('cover_image')) {
            // Delete old image if it exists
            if ($book->cover_image) {
                Storage::disk('public')->delete($book->cover_image);
            }
            
            $path = $request->file('cover_image')->store('books/covers', 'public');
            $validated['cover_image'] = $path;
        } elseif ($request->has('remove_cover_image') && $request->remove_cover_image) {
            // Delete old image if exists and user wants to remove it
            if ($book->cover_image) {
                Storage::disk('public')->delete($book->cover_image);
            }
            $validated['cover_image'] = null;
        } else {
            // If no new image is uploaded and no removal is requested, keep the old image
            unset($validated['cover_image']);
        }
        
        $book->update($validated);
        
        // Cargar las relaciones para la respuesta
        $book->load(['author', 'testimonials', 'faqs']);
        
        return response()->json($book);
    }
    
    /**
     * Eliminar un libro
     * 
     * @param \App\Models\Book $book
     * @return \Illuminate\Http\Response
     */
    public function destroy(Book $book)
    {
        // Check if book has purchases
        if ($book->purchases()->count() > 0) {
            return response()->json([
                'error' => 'Cannot delete book with associated purchases.'
            ], 422);
        }
        
        // Delete book cover image if it exists
        if ($book->cover_image) {
            Storage::disk('public')->delete($book->cover_image);
        }
        
        // Delete book digital file if it exists
        $digitalPath = storage_path("app/books/{$book->id}/digital-book.pdf");
        if (file_exists($digitalPath)) {
            unlink($digitalPath);
        }
        
        $book->delete();
        return response()->json(null, 204);
    }
    
    /**
     * Upload digital book file
     * 
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Book $book
     * @return \Illuminate\Http\Response
     */
    public function uploadDigitalBook(Request $request, Book $book)
    {
        $request->validate([
            'digital_book' => 'required|file|mimes:pdf|max:10240', // max 10MB
        ]);
        
        $path = storage_path("app/books/{$book->id}");
        
        // Create directory if it doesn't exist
        if (!file_exists($path)) {
            mkdir($path, 0755, true);
        }
        
        // Store the file
        $request->file('digital_book')->move($path, 'digital-book.pdf');
        
        return response()->json([
            'success' => true,
            'message' => 'Digital book uploaded successfully'
        ]);
    }
    
    /**
     * Procesa una solicitud de compra
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function processPurchase(Request $request)
    {
        $validated = $request->validate([
            'book_id' => 'required|exists:books,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'payment_method' => 'required|string|in:mercado_pago,whatsapp',
        ]);
        
        $book = Book::findOrFail($validated['book_id']);
        
        // Crear la compra
        $purchase = new Purchase([
            'book_id' => $book->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'price_paid' => $book->price,
            'payment_method' => $validated['payment_method'],
        ]);
        
        $purchase->save();
        
        // Generar token único para descarga
        $downloadToken = $purchase->generateDownloadToken();
        
        if ($validated['payment_method'] === 'mercado_pago') {
            // Integración con MercadoPago
            try {
                // Aquí iría la integración real con MercadoPago
                // Por ahora simularemos una respuesta exitosa
                
                // Simulación de ID de transacción de MercadoPago
                $paymentId = 'MP_' . Str::random(10);
                $purchase->payment_id = $paymentId;
                $purchase->save();
                
                // Enviar correo con el enlace de descarga
                $this->sendPurchaseEmail($purchase);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Tu compra ha sido procesada exitosamente.',
                    'payment_id' => $paymentId,
                    'download_url' => route('download.book', ['token' => $downloadToken]),
                ]);
            } catch (\Exception $e) {
                Log::error('Error en procesamiento de pago MercadoPago: ' . $e->getMessage());
                
                return response()->json([
                    'success' => false,
                    'message' => 'Hubo un error al procesar tu pago. Inténtalo de nuevo o contacta con soporte.'
                ], 500);
            }
        } else {
            // Para compras por WhatsApp, simplemente generamos el enlace
            $whatsappPhone = config('services.whatsapp.phone_number', '123456789');
            $whatsappMessage = urlencode("Hola, soy {$validated['name']}. Estoy interesado en comprar tu libro digital. Mi correo es {$validated['email']}");
            
            return response()->json([
                'success' => true,
                'message' => 'Redirigiendo a WhatsApp para completar la compra',
                'whatsapp_url' => "https://wa.me/{$whatsappPhone}?text={$whatsappMessage}",
                'purchase_id' => $purchase->id
            ]);
        }
    }
    
    /**
     * Envía el correo de confirmación de compra
     * 
     * @param \App\Models\Purchase $purchase
     * @return bool
     */
    private function sendPurchaseEmail(Purchase $purchase)
    {
        // En una aplicación real, aquí enviarías un correo real usando Mailables de Laravel
        // Por ahora simulamos que se envía correctamente
        
        Log::info("Correo enviado a {$purchase->email} con token de descarga {$purchase->download_token}");
        
        return true;
    }
    
    /**
     * Maneja la descarga del libro digital
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $token
     * @return \Illuminate\Http\Response
     */
    public function downloadBook(Request $request, $token)
    {
        // Buscar compra por token
        $purchase = Purchase::where('download_token', $token)
                           ->where('token_expires_at', '>', now())
                           ->first();
        
        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'El enlace de descarga no es válido o ha expirado.'
            ], 404);
        }
        
        // Verificar si ya se ha descargado antes (opcional: puedes permitir múltiples descargas)
        if ($purchase->is_downloaded) {
            // Opción 1: Bloquear después de primera descarga
            // return response()->json([
            //     'success' => false,
            //     'message' => 'Este libro ya ha sido descargado anteriormente.'
            // ], 403);
            
            // Opción 2: Permitir pero registrar
            Log::info("Descarga adicional del libro ID {$purchase->book_id} por compra ID {$purchase->id}");
        }
        
        // Marcar como descargado
        $purchase->is_downloaded = true;
        $purchase->save();
        
        // Obtener la ruta del archivo
        $book = $purchase->book;
        $filePath = storage_path("app/books/{$book->id}/digital-book.pdf");
        
        // Verificar que el archivo exista
        if (!file_exists($filePath)) {
            Log::error("Archivo no encontrado: {$filePath}");
            return response()->json([
                'success' => false,
                'message' => 'El archivo del libro no está disponible en estos momentos.'
            ], 404);
        }
        
        // Retornar el archivo para descarga
        return response()->download(
            $filePath, 
            Str::slug($book->title) . '.pdf', 
            ['Content-Type' => 'application/pdf']
        );
    }
}