const { createApp, ref, computed, onMounted } = Vue;

        // ====================================================================
        // PENTING: GANTI DENGAN KREDENSIAL CLOUDINARY ANDA
        // Anda bisa mendapatkan ini dari Dashboard Cloudinary Anda
        // Upload Preset bisa dibuat di Settings > Upload
        // ====================================================================
        const CLOUDINARY_CLOUD_NAME = 'dzx3qf4zy'; // Ganti dengan Cloud Name Anda
        const CLOUDINARY_UPLOAD_PRESET = 'Product_Form'; // Ganti dengan Upload Preset Anda

        // Firebase Firestore SDK
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
        import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
        
        createApp({
          setup() {
            // Firebase configuration from user's main.js
            const firebaseConfig = {
              apiKey: "AIzaSyBNDz7VwSE-gQkE1NK-sQpiYdNlB1BI46s",
              authDomain: "product-cicilan.firebaseapp.com",
              projectId: "product-cicilan",
              storageBucket: "product-cicilan.firebasestorage.app",
              messagingSenderId: "180951818261",
              appId: "1:180951818261:web:dbce045586d63ee678ee1c",
              measurementId: "G-D1PK016KK9"
            };
            
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            
            // App State
            const currentView = ref('table');
            const appLoading = ref(true);
            const products = ref([]);
            const product = ref({});
            const selectedProductId = ref(null);
            const isSaving = ref(false);
            const showDeleteModalState = ref(false);
            const productToDelete = ref(null);

            // State for Image Upload
            const selectedFile = ref(null);
            const imagePreviewUrl = ref(null);
            const isUploading = ref(false);
            const snackbar = ref({ show: false, text: '', color: '' });
            
            // Multipliers from user's main.js
            const multipliers = ref({
              electronics: {
                60: 1.1,
                90: 1.2,
                120: 1.3,
                150: 1.4,
                180: 1.5
              },
              furniture: {
                60: 1.05,
                90: 1.1,
                120: 1.15,
                150: 1.2,
                180: 1.25
              }
            });
            
            // Computed properties
            const formTitle = computed(() => {
              return selectedProductId.value ? 'Edit Produk' : 'Tambah Produk Baru';
            });
            
            const saveButtonText = computed(() => {
              if (isSaving.value) {
                return selectedProductId.value ? 'Menyimpan...' : 'Menambahkan...';
              }
              if (isUploading.value) {
                  return 'Mengunggah Gambar...';
              }
              return selectedProductId.value ? 'Simpan Perubahan' : 'Tambah Produk';
            });

            // Modal & Snackbar Functions
            const showDeleteModal = (id, name) => {
                productToDelete.value = { id, name };
                showDeleteModalState.value = true;
            };

            const hideDeleteModal = () => {
                showDeleteModalState.value = false;
                productToDelete.value = null;
            };

            const showSnackbar = (text, color) => {
                snackbar.value = { show: true, text, color };
                setTimeout(() => {
                    snackbar.value.show = false;
                }, 3000);
            };
            
            // Functions for View Switching
            const showTableView = () => {
              currentView.value = 'table';
              selectedProductId.value = null;
              product.value = {};
              selectedFile.value = null;
              imagePreviewUrl.value = null;
              fetchProducts(); // Refresh table
            };
            
            const showAddForm = () => {
              currentView.value = 'form';
              selectedProductId.value = null;
              product.value = {
                name: '',
                description: '',
                basePrice: 0,
                downPayment: 0,
                imageUrls: [],
                whatsappNumber: '',
                category: '',
                tenorOptions: []
              };
              selectedFile.value = null;
              imagePreviewUrl.value = null;
            };
            
            const showEditForm = async (id) => {
              currentView.value = 'form';
              selectedProductId.value = id;
              
              try {
                const productRef = doc(db, 'products', id);
                const productSnap = await getDoc(productRef);
                
                if (productSnap.exists()) {
                  const data = productSnap.data();
                  product.value = {
                    ...data,
                    basePrice: data.basePrice || 0,
                    downPayment: data.downPayment || 0,
                    tenorOptions: data.tenorOptions || [],
                    whatsappNumber: data.whatsappNumber || ''
                  };
                  if (data.imageUrls && data.imageUrls.length > 0) {
                      imagePreviewUrl.value = data.imageUrls[0];
                  } else {
                      imagePreviewUrl.value = null;
                  }
                  if (data.multipliers) {
                    multipliers.value = data.multipliers;
                  }
                } else {
                  showSnackbar("Error: Produk tidak ditemukan.", "bg-red-500");
                  selectedProductId.value = null;
                }
              } catch (error) {
                console.error("Kesalahan saat memuat produk:", error);
                showSnackbar("Error: Gagal memuat data produk.", "bg-red-500");
              }
            };
            
            // Functions for Firestore Operations
            const fetchProducts = async () => {
              appLoading.value = true;
              try {
                const productsCollection = collection(db, 'products');
                const productsSnapshot = await getDocs(productsCollection);
                
                products.value = productsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
              } catch (error) {
                console.error("Error fetching products:", error);
                showSnackbar("Gagal memuat daftar produk. Periksa koneksi internet.", "bg-red-500");
              } finally {
                appLoading.value = false;
              }
            };

            // Image Upload to Cloudinary
            const uploadImageToCloudinary = async (file) => {
                isUploading.value = true;
                showSnackbar("Mengunggah gambar...", "bg-blue-500");
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                
                try {
                    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                        method: 'POST',
                        body: formData,
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error?.message || 'Gagal mengunggah gambar ke Cloudinary.');
                    }
                    showSnackbar("Gambar berhasil diunggah!", "bg-green-500");
                    return data.secure_url;
                } catch (error) {
                    console.error("Cloudinary upload error:", error);
                    showSnackbar("Gagal mengunggah gambar!", "bg-red-500");
                    return null;
                } finally {
                    isUploading.value = false;
                }
            };

            const handleFileChange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    selectedFile.value = file;
                    imagePreviewUrl.value = URL.createObjectURL(file);
                }
            };

            const removeImage = () => {
                selectedFile.value = null;
                imagePreviewUrl.value = null;
                product.value.imageUrls = [];
                const fileInput = document.getElementById('imageUpload');
                if (fileInput) fileInput.value = '';
            };
            
            const saveProduct = async () => {
              isSaving.value = true;

              let newImageUrls = [];
              if (selectedFile.value) {
                  const uploadedImageUrl = await uploadImageToCloudinary(selectedFile.value);
                  if (uploadedImageUrl) {
                      newImageUrls = [uploadedImageUrl];
                  } else {
                      isSaving.value = false;
                      return;
                  }
              } else if (imagePreviewUrl.value) {
                  newImageUrls = [imagePreviewUrl.value];
              }

              product.value.imageUrls = newImageUrls;
              product.value.multipliers = multipliers.value;
              
              try {
                let docRef;
                if (selectedProductId.value) {
                  docRef = doc(db, 'products', selectedProductId.value);
                  await setDoc(docRef, product.value, { merge: true });
                  showSnackbar("Produk berhasil diperbarui!", "bg-green-500");
                } else {
                  docRef = doc(collection(db, 'products'));
                  await setDoc(docRef, product.value);
                  selectedProductId.value = docRef.id;
                  showSnackbar("Produk berhasil ditambahkan!", "bg-green-500");
                }
              } catch (error) {
                console.error("Kesalahan saat menyimpan produk:", error);
                showSnackbar("Error: Gagal menyimpan produk.", "bg-red-500");
              } finally {
                isSaving.value = false;
                showTableView();
              }
            };
            
            const confirmDelete = async () => {
              try {
                await deleteDoc(doc(db, 'products', productToDelete.value.id));
                showSnackbar(`Produk "${productToDelete.value.name}" berhasil dihapus.`, "bg-green-500");
                hideDeleteModal();
                fetchProducts(); // Refresh the list
              } catch (error) {
                console.error("Error deleting product:", error);
                showSnackbar("Gagal menghapus produk.", "bg-red-500");
              }
            };
            
            const formatCurrency = (value) => {
              if (typeof value !== 'number') return 'Rp0';
              return new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(value);
            };
            
            onMounted(() => {
              fetchProducts();
            });
            
            return {
              appLoading,
              currentView,
              products,
              product,
              multipliers,
              selectedProductId,
              isSaving,
              formTitle,
              saveButtonText,
              showTableView,
              showAddForm,
              showEditForm,
              saveProduct,
              confirmDelete,
              formatCurrency,
              handleFileChange,
              imagePreviewUrl,
              removeImage,
              isUploading,
              snackbar,
              showDeleteModalState,
              hideDeleteModal,
              productToDelete,
              showDeleteModal
            };
          },
        }).mount('#app');
