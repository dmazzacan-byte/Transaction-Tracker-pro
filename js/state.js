let state = {
    products: [],
    customers: [],
    orders: [],
    payments: [],
    users: [],
    profitability: {},
};

export function setState(newState) {
    state = { ...state, ...newState };
}

export function getState() {
    return state;
}
