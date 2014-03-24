function get_info(model)
{
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://together.jolla.com//api/v1/info/",true);
    xhr.onreadystatechange = function()
    {
        if ( xhr.readyState == xhr.DONE)
        {
            if ( xhr.status == 200)
            {
                var ginfo = JSON.parse(xhr.responseText);
                model.groups = ginfo.groups
                model.users = ginfo.users
                model.questions = ginfo.questions
                model.answers = ginfo.answers
                model.comments = ginfo.comments
//                model.append({"item" : "Groups: "+ginfo.groups})
//                model.append({"item" : "Users: "+ginfo.users})
//                model.append({"item" : "Questions: "+ginfo.questions})
//                model.append({"item" : "Answers: "+ginfo.answers})
//                model.append({"item" : "Comments: "+ginfo.comments})

                console.log("Info, comments: " + ginfo.comments)
            }
        }
    }
    xhr.send();

}

//
// Uses and updates properties
//      pagesCount
//      currentPage
//      questionsCount
// which are properties of main.qml
//
// Bit messy should refactor...
//
function get_questions(model, page, onLoadedCallback) {
    var query_params = "?"
    var isFirstParam = true

    if ((page !== undefined) && (page !== "")) {
        // If overlimit page given just return to first page
        if (page < 1 || page > model.pagesCount) {
            model.currentPageNum = 1
        }
        else {
            model.currentPageNum = page
            if (isFirstParam) {
                query_params = query_params + "page=" + page
            }
            else {
                query_params = query_params + "&page=" + page
            }
            isFirstParam = false
        }
    }
    else {
        // If no page given to query it's always first page, so corrent currentPage varible
        model.currentPageNum = 1
    }

    if (model.userIdSearchCriteria !== "") {
        if (isFirstParam) {
            query_params = query_params + "author=" + model.userIdSearchCriteria
        }
        else {
            query_params = query_params + "&author=" + model.userIdSearchCriteria
        }
        isFirstParam = false
    }


    // Scope: All (default) or only unanswered questions
    if (model.unansweredQuestionsFilter) {
        if (isFirstParam) {
            query_params = query_params + "scope=unanswered"
        }
        else {
            query_params = query_params + "&scope=unanswered"
        }
        isFirstParam = false
    }


    // searchCriteria is global and defined in main.qml
    // Order keeps persistent ones set.
    if (model.searchCriteria !== "") {
        if (isFirstParam) {
            query_params = query_params + "query=" + model.searchCriteria
        }
        else {
            query_params = query_params + "&query=" + model.searchCriteria
        }
        isFirstParam = false
    }

    //Tag search criteria
    if (modelSearchTagsGlobal.count > 0) {
        var tagsCriteria = ""
        for (var i = 0; i < modelSearchTagsGlobal.count; i++) {
            if (i === 0)
                tagsCriteria = modelSearchTagsGlobal.get(i).tag
            else
                tagsCriteria = tagsCriteria + "," + modelSearchTagsGlobal.get(i).tag
        }
        if (isFirstParam) {
            query_params = query_params + "tags=" + tagsCriteria
        }
        else {
            query_params = query_params + "&tags=" + tagsCriteria
        }
        isFirstParam = false
    }


    // sortingCriteria and sortingOrder are global and defined in main.qml
    // Order keeps persistent ones set.
    if (model.sortingCriteriaQuestions !== "") {
        var sortOrder = ""
        if (model.sortingOrder !== "") { sortOrder = "-" + model.sortingOrder }
        if (isFirstParam) {
            query_params = query_params + "sort=" + model.sortingCriteriaQuestions + sortOrder
        }
        else {
            query_params = query_params + "&sort=" + model.sortingCriteriaQuestions + sortOrder
        }
        isFirstParam = false
    }

    get_questions_httpReq(model, query_params, onLoadedCallback)
}

function get_questions_httpReq(model, query_params, onLoadedCallback)
{
    var xhr = new XMLHttpRequest();
    var url = "https://together.jolla.com//api/v1/questions/" + query_params
    urlLoading = true
    console.log(url)
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function()
    {
        if ( xhr.readyState == xhr.DONE)
        {
            if ( xhr.status == 200)
            {
                var response =  JSON.parse(xhr.responseText);

                // Pick global count values (non-page related)
                model.pagesCount = response.pages;
                model.questionsCount = response.count;
                // Fix currentpage if got less pages
                if (model.pagesCount < model.currentPageNum) {
                    model.currentPageNum = model.pagesCount
                }

                // Pick question related data
                var qs = response.questions;
                for (var index in qs)
                {
                    var ginfo = qs[index]

                    // Filter out closed questions
                    if (!model.closedQuestionsFilter) {
                        if (ginfo.closed)
                            continue
                    }
                    // Filter out questions with accepted answer
                    if (!model.answeredQuestionsFilter) {
                        if (ginfo.has_accepted_answer)
                            continue
                    }

                    // Filter out questions having ignored tag
                    if (ignoredSearchTagsGlobal.count > 0 && ginfo.tags.length > 0) {
                        var found = false
                        for (var i = 0; i < ignoredSearchTagsGlobal.count; i++) {
                            for (var j = 0; j < ginfo.tags.length; j++) {
                                if (ginfo.tags[j].toLowerCase() === ignoredSearchTagsGlobal.get(i).tag.toLowerCase()) {
                                    found = true
                                    break
                                }
                            }
                            if (found)
                                break
                        }
                        if (found)
                            continue
                    }

                    model.append({"title" : ginfo.title,
                                   "url" : ginfo.url,
                                   "author" : ginfo.author.username,
                                   "answer_count" : ginfo.answer_count,
                                   "view_count" : ginfo.view_count,
                                   "votes" : ginfo.score,
                                   "tags" : ginfo.tags,
                                   "text": ginfo.text,
                                   "has_accepted_answer": ginfo.has_accepted_answer,
                                   "closed": ginfo.closed,
                                   "created" : getTimeDurationAsString(ginfo.added_at),
                                   "updated" : getTimeDurationAsString(ginfo.last_activity_at),
                                 })
                }

                // Data is loaded, call user given callback
                if (onLoadedCallback)
                    onLoadedCallback()
            }
            else
            {
                console.log("Error: " + xhr.status)
            }
            urlLoading = false
        }    
    }
    xhr.timeout = 4000;
    xhr.ontimeout = function () { console.log("Timed out!!!"); }
    xhr.send();
}


function get_users(model, page) {
    var query_params = "?"
    var isFirstParam = true

    if ((page !== undefined) && (page !== "")) {
        // If overlimit page given just return to first page
        if (page < 1 || page > model.pagesCount) {
            model.currentPageNum = 1
        }
        else {
            model.currentPageNum = page
            if (isFirstParam) {
                query_params = query_params + "page=" + page
            }
            else {
                query_params = query_params + "&page=" + page
            }
            isFirstParam = false
        }
    }
    else {
        // If no page given to query it's always first page, so corrent currentPage varible
        model.currentPageNum = 1
    }

    // sortingCriteria and sortingOrder are global and defined in main.qml
    // Order keeps persistent ones set.
    if (model.sortingCriteriaUsers !== "") {
        if (isFirstParam) {
            query_params = query_params + "sort=" + model.sortingCriteriaUsers
        }
        else {
            query_params = query_params + "&sort=" + model.sortingCriteriaUsers
        }
        isFirstParam = false
    }

    model.pagesCount = 0
    model.usersCount = 0
    get_users_httpReq(model, query_params)
}

function get_users_httpReq(model, query_params)
{
    var xhr = new XMLHttpRequest();
    var url = siteBaseUrl + "/api/v1/users/" + query_params
    urlLoading = true
    console.log(url)
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function()
    {
        if ( xhr.readyState == xhr.DONE)
        {
            if ( xhr.status == 200)
            {
                var response =  JSON.parse(xhr.responseText);

                // Pick global count values (non-page related)
                model.pagesCount = response.pages;
                model.usersCount = response.count;
                // Fix currentpage if got less pages
                if (model.pagesCount < model.currentPageNum) {
                    model.currentPageNum = model.pagesCount
                }

                // Pick users related data
                var us = response.users;
                for (var index in us)
                {
                    var uinfo = us[index]

                    model.append({"username" : uinfo.username,
                                   "reputation" : uinfo.reputation,
                                   "avatar" : uinfo.avatar,
                                   "last_seen_at" : getTimeDurationAsString(uinfo.last_seen_at),
                                   "joined_at" : getTimeDurationAsString(uinfo.joined_at),
                                   "id" : uinfo.id,
                                   "url" : siteBaseUrl + "/users/" + uinfo.id + "/" + uinfo.username,
                                 })
                }
            }
            else
            {
                console.log("Error: " + xhr.status)
            }
            urlLoading = false
        }
    }
    xhr.timeout = 4000;
    xhr.ontimeout = function () { console.log("Timed out!!!"); }
    xhr.send();
}


function getTimeDurationAsString(seconds) {
    return secondsToString(getCurrentTimeAsSeconds() - seconds)
}

function secondsToString(seconds)
{
    var numdays = Math.floor(seconds / 86400);
    var numhours = Math.floor((seconds % 86400) / 3600);
    var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
    var numseconds = Math.floor(((seconds % 86400) % 3600) % 60);

    var value = "";
    var onlySeconds = true
    if (numdays > 0) { value = value + numdays + "d "; onlySeconds = false; }
    if (numhours > 0) { value = value + numhours + "h "; onlySeconds = false; }
    if (numminutes > 0) { value = value + numminutes + "min "; onlySeconds = false; }
    // Leave seconds away to save space, except if only seconds
    if (onlySeconds) {
        if (numseconds > 0) { value = "now" }
    }
    else {
        value = value + "ago "
    }
    return value;
}

function getCurrentTimeAsSeconds() {
    return Date.now() / 1000;
}
