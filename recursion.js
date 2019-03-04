const data = {
    prop1: 'dfs',
    prop2: {
        asd: {
            foo: 43,
            sdf: 'sdf',
            ori: 2
        },
        id: {
            oif: 96,
            prop: 'sdfa'
        }
    },
    lkd: 96,
};

function deepSearch(obj, searchTerm) {
    let found = 0;
    Object.values(obj).forEach(value => {
        if (typeof value === 'object') {
            found += deepSearch(value, searchTerm);
        } else if (value == searchTerm) {
            found += 1;
        }
    });
    return found;
}

// console.log(process.argv[2]);
console.log(deepSearch(data, process.argv[2]));