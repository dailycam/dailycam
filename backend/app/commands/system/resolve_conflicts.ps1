# 충돌된 __pycache__ 파일들을 팀원 것으로 해결
$conflictedFiles = git status --short | Select-String "UU.*__pycache__" | ForEach-Object {
    $parts = $_.Line -split '\s+'
    if ($parts.Length -ge 2) {
        $parts[-1]
    }
}

foreach ($file in $conflictedFiles) {
    Write-Host "Resolving: $file"
    git checkout --theirs $file
    git add $file
}

Write-Host "Done resolving __pycache__ conflicts"

