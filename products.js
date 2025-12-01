import { addProduct, getProducts, updateProduct, deleteProduct } from './firebase.js';

const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const productsTableBody = document.querySelector('#products-table tbody');
const modalTitle = document.getElementById('modal-title');

const openModal = (title = 'Add Product', product = {}) => {
    modalTitle.textContent = title;
    productForm.reset();
    productForm['product-id'].value = product.id || '';
    productForm['product-description'].value = product.description || '';
    productForm['product-price-retail'].value = product.priceRetail || '';
    productForm['product-price-wholesale'].value = product.priceWholesale || '';
    productModal.style.display = 'block';
};

const closeModal = () => {
    productModal.style.display = 'none';
};

const renderProducts = async () => {
    productsTableBody.innerHTML = '';
    const querySnapshot = await getProducts();
    querySnapshot.forEach(doc => {
        const product = { id: doc.id, ...doc.data() };
        const row = `
            <tr>
                <td>${product.description}</td>
                <td>${product.priceRetail}</td>
                <td>${product.priceWholesale}</td>
                <td class="actions">
                    <a href="#" class="edit-btn" data-id="${product.id}">Edit</a>
                    <a href="#" class="delete-btn" data-id="${product.id}">Delete</a>
                </td>
            </tr>
        `;
        productsTableBody.innerHTML += row;
    });
};

const handleFormSubmit = async (e) => {
    e.preventDefault();
    const id = productForm['product-id'].value;
    const productData = {
        description: productForm['product-description'].value,
        priceRetail: parseFloat(productForm['product-price-retail'].value),
        priceWholesale: parseFloat(productForm['product-price-wholesale'].value),
    };

    try {
        if (id) {
            await updateProduct(id, productData);
        } else {
            await addProduct(productData);
        }
        closeModal();
        await renderProducts();
    } catch (error) {
        console.error('Error saving product:', error);
    }
};

const handleTableClick = async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        e.preventDefault();
        const doc = await getProducts().then(snapshot => snapshot.docs.find(doc => doc.id === id));
        if (doc) {
            const product = { id: doc.id, ...doc.data() };
            openModal('Edit Product', product);
        }
    } else if (target.classList.contains('delete-btn')) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(id);
                await renderProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
            }
        }
    }
};

export const initProducts = () => {
    document.getElementById('add-product-btn').addEventListener('click', () => openModal());
    productModal.querySelector('.close-button').addEventListener('click', closeModal);
    productForm.addEventListener('submit', handleFormSubmit);
    productsTableBody.addEventListener('click', handleTableClick);

    renderProducts();
};
