let state = {
    products: [],
    customers: [],
    orders: [],
    payments: [],
    users: [],
};

export function setState(newState) {
    state = { ...state, ...newState };
}

export function getState() {
    return state;
}
