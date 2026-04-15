-- Add Two Sum (LeetCode) with Python and C++ brute-force solutions

insert into problems (title, url, platform, difficulty, tags)
values (
  'Two Sum',
  'https://leetcode.com/problems/two-sum/',
  'leetcode',
  'Easy',
  array['array', 'hash-table']
)
on conflict (url) do nothing;

-- Python solution
insert into solutions (problem_name, problem_number, language, solution_code)
select
  p.title,
  p.problem_number,
  'python',
  $code$class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        n = len(nums)
        for i in range(n):
            for j in range(i+1, n):
                if nums[i] + nums[j] == target:
                    return (i, j)
    # Time: O(n^2)
    # Space: O(1)$code$
from problems p
where p.url = 'https://leetcode.com/problems/two-sum/'
on conflict (problem_number, language) do update
  set solution_code = excluded.solution_code;

-- C++ solution
insert into solutions (problem_name, problem_number, language, solution_code)
select
  p.title,
  p.problem_number,
  'cpp',
  $code$#include <vector>

using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        int n = nums.size();
        for (int i = 0; i < n; ++i) {
            for (int j = i + 1; j < n; ++j) {
                if (nums[i] + nums[j] == target) {
                    return {i, j};
                }
            }
        }
        return {}; // If no solution found
    }
};

// Time: O(n^2)
// Space: O(1)$code$
from problems p
where p.url = 'https://leetcode.com/problems/two-sum/'
on conflict (problem_number, language) do update
  set solution_code = excluded.solution_code;
