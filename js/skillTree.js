var SkillTree = angular.module('skillTree', []);

SkillTree.controller('skillTreeController', ['$scope', '$http', '$window', function($scope, $http, $window) {
    //Load Meta Data
    $http.get($window.folderName + '/Meta.json')
    .then(function(meta){
        //initialize skill points
        $scope.skillPoints = {
            "initialSP": parseInt(meta.data.initialSP),
            "totalSkillPoints": parseInt(meta.data.initialSP) + 1,
            "usedSkillPoints": 0
        }

        //This object will contain a list of all the skills on screen and their allocation
        $scope.skillAllocation = [];

        //initialize classes
        $scope.class = {
            "selected": meta.data.initialClass,
            "classes": [],
            "classData": {}
        };

        //initialize level selector
        $scope.level = {
            "selected": 1,
            "levels": []
        }
        for(var i = 1; i <= meta.data.maxLevel; i++) {
            $scope.level.levels.push(i);
        };

        //initialize retirement selector
        $scope.retirement = {
            "selected": meta.data.initialRetirementData,
            "retirements": [],
            "retirementData": meta.data.retirementData
        }
        for(var keyName in meta.data.retirementData) {
            var key = keyName;
            $scope.retirement.retirements.push(key);
        }
    });

    //Load Class Data
    $http.get($window.folderName + '/Classes.json')
        .then(function(classes){
            //More class initialization
            for(var keyName in classes.data) {        
                var key = keyName;
                $scope.class.classes.push(key);
            };
            $scope.class.classData = classes.data;
        });
            

    //Load Skill Data
    $http.get($window.folderName + '/Skills.json')
        .then(function(skills){

            //Skill Initialization
            $scope.skills = skills.data;
        });

    //Update skill points when selected level or retirement is changed
    $scope.updateSP = function() {
        var retiredSp = $scope.retirement.retirementData[$scope.retirement.selected];
        retiredSp = undefined ? '0' : retiredSp;
        $scope.skillPoints.totalSkillPoints = parseInt($scope.skillPoints.initialSP) + parseInt($scope.level.selected) + parseInt(retiredSp);
    };

    //Increase point in a skill
    $scope.increasePoint = function(skill) {
        for (upstream in $scope.skills[skill].Upstream) {
            if ($scope.skillAllocation[upstream] < $scope.skills[skill].Upstream[upstream]){
                return;
            }
        }
        if($scope.skillPoints.usedSkillPoints < $scope.skillPoints.totalSkillPoints && $scope.skillAllocation[skill] < $scope.skills[skill].MaxLevel) {
            $scope.skillAllocation[skill]++;
            $scope.skillPoints.usedSkillPoints++;
        }
    }

    //Decrease point in a skill
    $scope.decreasePoint = function(skill, points) {
        if($scope.skillPoints.usedSkillPoints > 0 && $scope.skillAllocation[skill] >= points) {
            $scope.skillAllocation[skill] -= points;
            $scope.skillPoints.usedSkillPoints -= points;
        }

        for (downstream in $scope.skills[skill].Downstream) {
            if ($scope.skillAllocation[downstream] > 0 && $scope.skillAllocation[skill] < $scope.skills[downstream].Upstream[skill]){
                $scope.decreasePoint(downstream, $scope.skillAllocation[downstream]);
            }
        }
    }

    //Disable a skill
    $scope.shouldDisable = function(skill) {
        for (upstream in $scope.skills[skill].Upstream) {
            if ($scope.skillAllocation[upstream] < $scope.skills[skill].Upstream[upstream]){
                return true;
            }
        }
        return false;
    }

    //Draw line and level requirement
    $scope.drawLine = function(skill, element) {
        for (upstream in $scope.skills[skill].Upstream) {
            template = '<svg class="line" width="1000" height="600"><line stroke="navy" stroke-width="2.5" x1="' + (180 * parseInt($scope.skills[upstream].Location.x) + 50)
             + '" y1="' + (50 + 80 * parseInt($scope.skills[upstream].Location.y)) + '" x2="' + (180 * parseInt($scope.skills[skill].Location.x) + 50) + '" y2="' + (50 + 80 * parseInt($scope.skills[skill].Location.y))
             + '"/> <rect x="' + (((180 * parseInt($scope.skills[skill].Location.x) + 50) + (180 * parseInt($scope.skills[upstream].Location.x) + 50)) / 2 - 10) + '" y="' + (((50 + 80 * parseInt($scope.skills[upstream].Location.y))
             + (50 + 80 * parseInt($scope.skills[skill].Location.y))) / 2 - 10) + '" width="20" height="20" fill="white"></rect> <text stroke="navy" text-anchor="middle" x="' + (((180 * parseInt($scope.skills[skill].Location.x) + 50)
             + (180 * parseInt($scope.skills[upstream].Location.x) + 50)) / 2) + '" y="' + (((50 + 80 * parseInt($scope.skills[upstream].Location.y)) + (50 + 80 * parseInt($scope.skills[skill].Location.y))) / 2 + 5) + '"> '
             + $scope.skills[skill].Upstream[upstream] + '</text></svg>'
            element.append(template);
        }
    }
}])
.directive("skillIcon", ['$compile', function($compile) {
    return {
        restrict: 'E',
        link: function ($scope, $element, $attrs) {
            angular.element(document).ready(function() {
                $scope.$apply(function() {
                    //Initialize the skill in skill allocation table
                    $scope.skillAllocation[$attrs.skill] = 0;
                    
                    //Read the skill data and create a div
                    skill = $scope.skills[$attrs.skill];
                    skillBlock = $compile('<div class="skill-icon" style="left:' + 180 * parseInt($scope.skills[$attrs.skill].Location.x) + 'px; top:' + (100 + 80 * parseInt($scope.skills[$attrs.skill].Location.y)) + 'px; " ng-class="{disabled: shouldDisable(\'' + $attrs.skill + '\')}">' + skill.Name + ' <div class="skill-allocation"> {{skillAllocation[\'' + $attrs.skill + '\']}}/' + skill.MaxLevel + '</div></div>')($scope);
                    dummyBlock = '<div class="dummy" style="left:' + 180 * parseInt($scope.skills[$attrs.skill].Location.x) + 'px; top:' + (100 + 80 * parseInt($scope.skills[$attrs.skill].Location.y)) + 'px; " ng-class="{disabled: shouldDisable(\'' + $attrs.skill + '\')}"/>';
                    //Create buttons
                    buttonDiv = angular.element("<div/>");
                    increaseButton = $compile('<button ng-click="increasePoint(\'' + $attrs.skill + '\')" class="increase button" ng-class="{disabled: skillAllocation[\'' + $attrs.skill + '\'] >= skills[\'' + $attrs.skill + '\'].MaxLevel}"> + </button>')($scope);
                    minusButton = $compile('<button ng-click="decreasePoint(\'' + $attrs.skill + '\', 1)" class="minus button" ng-class="{disabled: skillAllocation[\'' + $attrs.skill + '\'] == 0}"> - </button>')($scope);
                    $element.append(dummyBlock).append(skillBlock.append(buttonDiv.append(increaseButton).append(minusButton)));

                    //draw lines
                    $scope.drawLine($attrs.skill, $element);
                    //<div class="line" style="width: 24px; height: 4px; left: 240px; top: 120px;"></div>
                });
            });
        }
    };
}]);