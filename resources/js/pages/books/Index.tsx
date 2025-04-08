import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Books',
        href: '/books',
    },
];

export default function BooksIndex() {
    const [books, setBooks] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAuthor, setSelectedAuthor] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    
    // Initialize the form with Inertia useForm
    const form = useForm({
        title: '',
        subtitle: '',
        description: '',
        price: '',
        author_id: '',
        cover_image: null,
        features: [],
        remove_cover_image: false,
    });
    
    useEffect(() => {
        fetchBooks();
        fetchAuthors();
    }, []);
    
    useEffect(() => {
        fetchBooks(selectedAuthor);
    }, [selectedAuthor]);
    
    const fetchBooks = async (authorId = '') => {
        setLoading(true);
        try {
            const url = authorId ? `/api/books?author_filter=${authorId}` : '/api/books';
            const response = await axios.get(url);
            setBooks(response.data);
        } catch (error) {
            console.error('Error fetching books:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchAuthors = async () => {
        try {
            const response = await axios.get('/api/authors');
            setAuthors(response.data);
        } catch (error) {
            console.error('Error fetching authors:', error);
        }
    };
    
    const handleAuthorFilterChange = (e) => {
        setSelectedAuthor(e.target.value);
    };
    
    const openCreateModal = () => {
        resetForm();
        setIsCreateModalOpen(true);
    };
    
    const closeCreateModal = () => {
        resetForm();
        setIsCreateModalOpen(false);
    };
    
    const openEditModal = (book) => {
        setEditingBook(book);
        form.setData({
            title: book.title,
            subtitle: book.subtitle || '',
            description: book.description,
            price: book.price,
            author_id: book.author_id,
            features: book.features || [],
            remove_cover_image: false,
        });
        
        if (book.cover_image) {
            setCoverPreview(`/storage/${book.cover_image}`);
        } else {
            setCoverPreview(null);
        }
        
        setIsEditModalOpen(true);
    };
    
    const closeEditModal = () => {
        setEditingBook(null);
        resetForm();
        setIsEditModalOpen(false);
    };
    
    const resetForm = () => {
        form.reset();
        form.clearErrors();
        setCoverPreview(null);
    };
    
    const handleCoverImageChange = (e) => {
        const file = e.target.files[0];
        
        if (file) {
            form.setData('cover_image', file);
            form.setData('remove_cover_image', false);
            
            // Create preview URL
            const reader = new FileReader();
            reader.onload = (event) => {
                setCoverPreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveCoverImage = () => {
        form.setData('cover_image', null);
        form.setData('remove_cover_image', true);
        setCoverPreview(null);
    };
    
    const handleFeatureChange = (e, index) => {
        const updatedFeatures = [...form.data.features];
        updatedFeatures[index] = e.target.value;
        form.setData('features', updatedFeatures);
    };
    
    const addFeature = () => {
        form.setData('features', [...form.data.features, '']);
    };
    
    const removeFeature = (index) => {
        const updatedFeatures = [...form.data.features];
        updatedFeatures.splice(index, 1);
        form.setData('features', updatedFeatures);
    };
    
    const handleCreateSubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        Object.keys(form.data).forEach(key => {
            if (key === 'features') {
                formData.append(key, JSON.stringify(form.data[key]));
            } else if (form.data[key] !== null) {
                formData.append(key, form.data[key]);
            }
        });
        
        axios.post('/api/books', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then(response => {
            closeCreateModal();
            fetchBooks(selectedAuthor);
            alert('Book created successfully!');
        })
        .catch(error => {
            console.error('Error creating book:', error);
            if (error.response && error.response.data && error.response.data.errors) {
                form.setErrors(error.response.data.errors);
            }
        });
    };
    
    const handleEditSubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        Object.keys(form.data).forEach(key => {
            if (key === 'features') {
                formData.append(key, JSON.stringify(form.data[key]));
            } else if (form.data[key] !== null) {
                formData.append(key, form.data[key]);
            }
        });
        
        // For PUT/PATCH requests with FormData, need to include method spoofing
        formData.append('_method', 'PUT');
        
        axios.post(`/api/books/${editingBook.id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then(response => {
            closeEditModal();
            fetchBooks(selectedAuthor);
            alert('Book updated successfully!');
        })
        .catch(error => {
            console.error('Error updating book:', error);
            if (error.response && error.response.data && error.response.data.errors) {
                form.setErrors(error.response.data.errors);
            }
        });
    };
    
    const handleDeleteBook = (bookId) => {
        if (confirm('Are you sure you want to delete this book?')) {
            axios.delete(`/api/books/${bookId}`)
                .then(() => {
                    fetchBooks(selectedAuthor);
                    alert('Book deleted successfully!');
                })
                .catch(error => {
                    console.error('Error deleting book:', error);
                    if (error.response && error.response.data && error.response.data.error) {
                        alert(error.response.data.error);
                    }
                });
        }
    };

    // Modal component
    const Modal = ({ isOpen, onClose, title, children }) => {
        if (!isOpen) return null;
        
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="sticky top-0 flex justify-between items-center p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    // Book form component (shared between create and edit)
    const BookForm = ({ onSubmit, submitButtonText }) => (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Basic Information */}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={form.data.title}
                            onChange={e => form.setData('title', e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                            required
                        />
                        {form.errors.title && (
                            <p className="text-red-500 text-xs mt-1">{form.errors.title}</p>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Subtitle
                        </label>
                        <input
                            id="subtitle"
                            type="text"
                            value={form.data.subtitle}
                            onChange={e => form.setData('subtitle', e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        />
                        {form.errors.subtitle && (
                            <p className="text-red-500 text-xs mt-1">{form.errors.subtitle}</p>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="author_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Author <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="author_id"
                            value={form.data.author_id}
                            onChange={e => form.setData('author_id', e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                            required
                        >
                            <option value="">Select an author</option>
                            {authors.map((author) => (
                                <option key={author.id} value={author.id}>
                                    {author.name}
                                </option>
                            ))}
                        </select>
                        {form.errors.author_id && (
                            <p className="text-red-500 text-xs mt-1">{form.errors.author_id}</p>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.price}
                                onChange={e => form.setData('price', e.target.value)}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 pr-3 py-2 text-sm"
                                required
                            />
                        </div>
                        {form.errors.price && (
                            <p className="text-red-500 text-xs mt-1">{form.errors.price}</p>
                        )}
                    </div>
                </div>
                
                {/* Right Column - Media and Description */}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="cover_image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cover Image
                        </label>
                        <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 px-6 pt-5 pb-6">
                            <div className="space-y-1 text-center">
                                {coverPreview ? (
                                    <div className="mb-4">
                                        <div className="relative inline-block">
                                            <img
                                                src={coverPreview}
                                                alt="Cover preview"
                                                className="mx-auto h-32 w-auto rounded-md object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemoveCoverImage}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <svg
                                        className="mx-auto h-12 w-12 text-gray-400"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 48 48"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative cursor-pointer rounded-md bg-white dark:bg-gray-800 font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500"
                                    >
                                        <span>Upload a file</span>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            className="sr-only"
                                            onChange={handleCoverImageChange}
                                            accept="image/*"
                                        />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    PNG, JPG, GIF up to 2MB
                                </p>
                            </div>
                        </div>
                        {form.errors.cover_image && (
                            <p className="text-red-500 text-xs mt-1">{form.errors.cover_image}</p>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="description"
                            rows={4}
                            value={form.data.description}
                            onChange={e => form.setData('description', e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                            required
                        />
                        {form.errors.description && (
                            <p className="text-red-500 text-xs mt-1">{form.errors.description}</p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Book Features Section */}
            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Book Features
                    </label>
                    <button
                        type="button"
                        onClick={addFeature}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                    >
                        Add Feature
                    </button>
                </div>
                
                {form.data.features.length > 0 ? (
                    <div className="space-y-2">
                        {form.data.features.map((feature, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={feature}
                                    onChange={(e) => handleFeatureChange(e, index)}
                                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                                    placeholder="Enter a feature"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeFeature(index)}
                                    className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No features added yet. Click "Add Feature" to add book features.
                    </p>
                )}
            </div>
            
            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-5">
                <button
                    type="button"
                    onClick={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    {submitButtonText}
                </button>
            </div>
        </form>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Books" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Books Catalog</h1>
                    <div className="flex gap-4">
                        <div className="flex items-center">
                            <label htmlFor="author-filter" className="mr-2 text-sm font-medium">Filter by Author:</label>
                            <select
                                id="author-filter"
                                value={selectedAuthor}
                                onChange={handleAuthorFilterChange}
                                className="rounded-md border border-gray-300 py-1 px-3 text-sm"
                            >
                                <option value="">All Authors</option>
                                {authors.map((author) => (
                                    <option key={author.id} value={author.id}>
                                        {author.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700"
                        >
                            Add New Book
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((placeholder) => (
                            <div key={placeholder} className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                                <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {books.length > 0 ? (
                            books.map((book) => (
                                <div key={book.id} className="border dark:border-sidebar-border overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
                                    <div className="aspect-[4/3] relative overflow-hidden">
                                        {book.cover_image ? (
                                            <img 
                                                src={`/storage/${book.cover_image}`} 
                                                alt={book.title}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
                                                <span className="text-gray-400">No Cover Image</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                            <span className="inline-block px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded">
                                                ${book.price.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h2 className="text-lg font-semibold line-clamp-1">{book.title}</h2>
                                        {book.subtitle && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                                                {book.subtitle}
                                            </p>
                                        )}
                                        <div className="flex items-center mt-2">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                by {book.author ? book.author.name : 'Unknown Author'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">
                                            {book.description}
                                        </p>
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => openEditModal(book)}
                                                className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBook(book.id)}
                                                className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 flex justify-center items-center h-40 border rounded-xl">
                                <p className="text-gray-500">No books found. Please add a new book or adjust your filter.</p>
                            </div>
                        )}
                    </div>
                )}

                {!loading && books.length > 0 && (
                    <div className="mt-8 border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-4">
                        <h2 className="text-lg font-semibold mb-4">Book Stats</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Total Books</span>
                                <p className="text-2xl font-bold">{books.length}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Average Price</span>
                                <p className="text-2xl font-bold">
                                    ${(books.reduce((sum, book) => sum + parseFloat(book.price), 0) / books.length).toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Featured Authors</span>
                                <p className="text-2xl font-bold">
                                    {new Set(books.map(book => book.author ? book.author.id : null).filter(Boolean)).size}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Create Book Modal */}
            <Modal 
                isOpen={isCreateModalOpen} 
                onClose={closeCreateModal}
                title="Create New Book"
            >
                <BookForm 
                    onSubmit={handleCreateSubmit} 
                    submitButtonText="Create Book" 
                />
            </Modal>
            
            {/* Edit Book Modal */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={closeEditModal}
                title="Edit Book"
            >
                <BookForm 
                    onSubmit={handleEditSubmit} 
                    submitButtonText="Update Book" 
                />
            </Modal>
        </AppLayout>
    );
}