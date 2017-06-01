// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

//
var host = ""; //"http://localhost:8080";
var sessionId = null;
var siteDescription = "";
var siteId = "";
var newSiteId = "";
var newSiteTitle = "";
var request = require("request");
var moment = require('moment');
request = request.defaults({jar: true});
if (window.localStorage.getItem("host")) {
	document.querySelector("#hostInput").value = window.localStorage.getItem("host");
}
document.querySelector('#getAssignments').addEventListener('click', function(e) {
	host = document.querySelector("#hostInput").value;
	window.localStorage.setItem("host", host);
	siteId = document.querySelector('#siteIdInput').value;
	username = document.querySelector('#username').value;
	password = document.querySelector('#password').value;
	logIn();
});
document.querySelector('#shiftDays').addEventListener('input', updateAssignmentShiftTimes);
document.querySelector('#shiftHours').addEventListener('input', updateAssignmentShiftTimes);
document.querySelector('#updateSelectedAssignmentsButton').addEventListener('click', updateSelectedAssignments);
document.querySelector('#changeCourseButton').addEventListener('click', changeCourse);
document.querySelector('#checkAll').addEventListener('click', function () {
	if ($("#checkAll").is(":checked")) {
		$(".assignmentCheckbox").prop("checked",true);
	} else {
		$(".assignmentCheckbox").prop("checked",false);
	}
});



// log in
function logIn() {
	request.post({url:host+"/direct/session", form: {_username:username,_password:password}}, function(err,httpResponse,body){ 
			if (httpResponse.statusCode == 403 || httpResponse.statusCode == 301 ) {
				alert("Invalid Login");
			} else {
				sessionId = body;
				//alert(":" +httpResponse.statusCode + ":" + err);
				$("#assignmentUpdatePane").show();
    			$("#loginPane").hide();
				getSiteId();
			}
		});
}

function getSiteId() { 
	if (siteId.substring(0,4)=="http") { // is a URL...probably, parse it
		siteIdStart = siteId.indexOf("site/") + 5;
		if (siteIdStart == 4) {
			alert("Could not find a siteId in that URL. Can't continue. :(");
		} else {
			siteIdEnd = siteId.indexOf("/",siteIdStart) == -1 ? siteId.length : siteId.indexOf("/",siteIdStart);
			newSiteId = siteId.substring(siteIdStart,siteIdEnd);
		}
	} else { // is a plain siteId...probably, pass it through
		newSiteId = siteId;
	}
	siteId = newSiteId;
	getAssignments();
} 

function getAssignments() {
	request(host+"/direct/assignment/site/"+siteId+".json", function(err, res, body) {
		
		siteAssignments = JSON.parse(body);
		siteAssignments.assignment_collection.forEach(function(assignment) {
			$("#assignmentList").append("<div class='assignmentItem' id='row-"+assignment.id+"'><span class='assignmentCheck'><input type='checkbox' id='"+assignment.id+"' class='assignmentCheckbox'><span class='assignmentTitle'>"+ assignment.title + "</span><span class='dueDate'>" + assignment.dueTime.display + "</span><span class='shiftedDueDate' originalDueDate='"+assignment.dueTime.time+"'><span class='newDueDate'></span></span><!--<span><button class='shiftAssignmentDatesButton' assignmentId='"+assignment.id+"'>Update This Assignment</button></span>--></div>");
		});
		$('.shiftAssignmentDatesButton').click(function() {
			assignmentId = $(this).attr("assignmentId");
			updateAssignment(assignmentId);
		});
		updateAssignmentShiftTimes();
	});
}

function updateAssignmentShiftTimes() {
	if ($('#shiftDays').val() % 1 !=0 || $('#shiftHours').val() % 1 !=0) {
		alert("Sorry, no decimals, please!  Rounding number...");
	}
	$('#shiftDays').val(Math.round($('#shiftDays').val()));
	$('#shiftHours').val(Math.round($('#shiftHours').val()));
	$('.shiftedDueDate').each(function() {
		originalTime = moment.unix($(this).attr('originalDueDate')/1000);
		shiftedTime = originalTime.add($('#shiftDays').val(),'d');
		shiftedTime = originalTime.add($('#shiftHours').val(),'h');
		$(this).find('.newDueDate').text(originalTime.format('MMM D, YYYY h:mm a'));
	});
}

function updateAssignment(assignmentId, multiple=false) { 
	shiftDays = $('#shiftDays').val();
	shiftHours = $('#shiftHours').val();
	var testhing = "beep";
	var req = $.ajax({
		url: host+"/sakai-ws/rest/assignments/shiftAssignmentDates?assignmentId=" + assignmentId + "&shiftDays="+ shiftDays + "&shiftHours=" + shiftHours + "&sessionId=" + sessionId,
		dataType: "text"
	}).done(function(data) {
			updateRowStatus(data, assignmentId);
		});
	if (!multiple) {
		refreshAssignments();
	}
	return req.promise();
}

function updateRowStatus(data, assignmentId) {
	if (data=="success") {
		//alert("yay!");
		//$("#row-"+assignmentId).toggleClass('done');
	} else {
		//alert("An error occurred: "+body+":"+host+"/sakai-ws/rest/assignments/shiftAssignmentDates?assignmentId=" + assignmentId + "&shiftDays="+ shiftDays + "&shiftHours=" + shiftHours ); //+ "&sessionId=" + sessionId);
	}
}

var selectedItemPromises = [];
function updateSelectedAssignments() {
	selectedItemPromises = [];
	$(".assignmentCheckbox:checked").each(function() {
		selectedItemPromises.push(updateAssignment($(this).attr('id'), true));
	});
	$.when.apply($, selectedItemPromises).then(refreshAssignments());
}

function refreshAssignments() {
	$('#assignmentList').text('');
	getAssignments();
	$("#checkAll").prop("checked",false);
}

function changeCourse() {
	$('#assignmentList').text('');
	siteId = document.querySelector('#siteIdNew').value;
	getSiteId();
}
