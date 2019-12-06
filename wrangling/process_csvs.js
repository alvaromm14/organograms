var d3 = require('d3');
var _ = require('lodash');
var fs = require('fs');

// function checkData(data) {
//     allIds = data.map(d => d.id);
//     allIds = _.uniq(allIds);

//     allParentIds = data.map(d => d.parentId);
//     allParentIds = _.uniq(allParentIds);
    
//     // console.log(allIds, allParentIds);

//     console.log('data length', data.length, 'allIds length', allIds.length);

//     allParentIds.forEach(id => {
//         if(!_.includes(allIds,  id)) {
//             console.log('no parent for', id);
//         }
//     });
// }

function cullCols(data) {
    let ret = data.map(d => {
        return {
            date: d['Back to Index'],
            level: d['Senior/Junior'],
            id: d['Post Unique Reference'],
            parentId: d['Reports to Senior Post']
        };
    });

    return ret;
}

function capitaliseRootId(data) {
    let ret = data.map(d => {
        return {
            date: d.date,
            level: d.level,
            id: d.id,
            parentId: d.parentId.toUpperCase() === 'XX' ? 'XX' : d.parentId
        };
    });

    return ret;
}

function getSingleDate(data) {
    // CSV contains more than one date, so keep just the topmost date
    let firstDate = data[0].date;
    
    let ret = data.filter(d => d.date === firstDate);
    return ret;
}

function fixCircularRelations(data) {
    // In some cases e.g. DCMS Mar-15, some parentIds === id
    // In these cases, change parentId to 'XX'
    // Not sure if this is correct, but it at least allows tree to be created
    let ret = data.map(d => {
        return {
            date: d.date,
            level: d.level,
            id: d.id,
            parentId: d.id === d.parentId ? 'XX' : d.parentId
        };
    });

    return ret;
}

function addUniqueRoot(data) {
    // If there's more than one root (i.e. parent is XX)
    // create a new root and point the original roots at it

    var roots = data.filter(d => d.parentId === 'XX');
    if (roots.length === 1) {
        return data;
    }

    if (roots.length === 0) {
        console.log('error: no root');
        return data;
    }

    data.unshift({
        date: '',
        level: '',
        id: 'root',
        parentId: 'XX'
    });

    roots.forEach(d => {
        d.parentId = 'root'
    });

    return data;
}

function filterOutDuplicateIds(data) {
    // Due to job sharing etc. some (unique!) ids are duplicated
    // For now just remove duplicates...
    let ids = [];
    
    let filtered = [];
    data.forEach(d => {
        if(d.id !== '' && _.includes(ids, d.id)) return;

        filtered.push(d);
        ids.push(d.id);
    });

    return filtered;
}

function filterOutRowsWithMissingParent(data) {
    // If a row's parent doesn't exist, filter out
    let allIds = data.map(d => d.id);
    console.log('allIds', allIds, _.includes(allIds, '405'))
    allIds = _.uniq(allIds);
    allIds.push('XX');

    let filtered = data.filter(d => _.includes(allIds, d.parentId));

    return filtered;
}

function rewriteXXToBlank(data) {
    // XX represents root in the data, but D3's stratify requires root to be ''
    let ret = data.map(d => {
        return {
            date: d.date,
            level: d.level,
            id: d.id,
            parentId: d.parentId === 'XX' ? '' : d.parentId
        };
    });

    return ret;
}

fs.readdir('csv', (err, files) => {
    files.forEach(file => {
        var f = fs.readFileSync('csv/' + file, 'utf8');
        var data = d3.csvParse(f);

        console.log(file);

        data = cullCols(data);
        data = getSingleDate(data);

        data = capitaliseRootId(data);
        data = fixCircularRelations(data);

        data = addUniqueRoot(data);
        data = filterOutDuplicateIds(data);
        data = filterOutRowsWithMissingParent(data);

        data = rewriteXXToBlank(data);

        var csv = d3.csvFormat(data)

        // console.log(csv);

        fs.writeFileSync('processed/' + file, csv);
    });
});

