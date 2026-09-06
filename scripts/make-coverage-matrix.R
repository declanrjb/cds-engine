library(tidyverse)
library(kableExtra)

git_base_link <- 'https://github.com/declanrjb/cds-engine/blob/main/'

trim_string <- function(string, limit) {
  if (str_length(string) > limit) {
    string <- substr(string, 0, limit - 3)
    string <- paste(string, '...', sep='')
  }
  return(string)
}

files <- list.files('data/cds-docs', recursive=TRUE, full.names=TRUE)
directory <- read_csv('data/ipeds/hd2025.csv')
directory <- directory |> 
  select(UNITID, INSTNM, STABBR, WEBADDR, INSTSIZE) |>
  mutate(
    UNITID = as.character(UNITID)
  )

files <- as_tibble(files)
colnames(files) <- c('file')

files$unitid <- files$file |>
  str_split_i('/', -1) |>
  str_replace('.pdf', '')

files$year <- files$file |>
  str_split_i('/', -2) |>
  str_split_i('-', 1)

files$url <- paste(git_base_link, files$file, '?token=A2MPB4CGSY4ZJYD25HC6263KPAI7E', sep='')

files <- files |>
  left_join(directory, by=c('unitid' = 'UNITID'))

# missing: https://public.flourish.studio/uploads/1447708/28c69406-d4a3-44a0-b2d9-1e6f4212b28a.svg
# present: https://public.flourish.studio/uploads/1447708/01af279a-7cff-47af-99f0-1b12cb044687.svg

files$anchor <- files$url |>
  lapply(function(url) {
    str_glue('https://public.flourish.studio/uploads/1447708/01af279a-7cff-47af-99f0-1b12cb044687.svg')
  }) |>
  unlist()

files <- files |>
  mutate(
    INSTNM = paste(INSTNM, ' (', STABBR, ')', sep='') |>
      lapply(trim_string, 42)
  )

files <- files |>
  mutate(
    INSTNM = paste('<a href="https://declanrjb.github.io/cds-engine/?unitid=', unitid, '">', INSTNM, '</a>', sep='')
  )

export_table <- files |>
  filter(year != 'no') |>
  filter(year >= 2021) |>
  select(INSTNM, year, anchor, unitid) |> 
  group_by(INSTNM, unitid, year) |>
  summarize(anchor = first(anchor)) |>
  pivot_wider(id_cols=c('INSTNM', 'unitid'), names_from='year', values_from='anchor')

export_table <- export_table %>%
  replace(is.na(.), 'https://public.flourish.studio/uploads/1447708/28c69406-d4a3-44a0-b2d9-1e6f4212b28a.svg') |>
  rename(Institution = INSTNM)

export_table |>
  write.csv('data/viz/cds-search.csv', row.names=FALSE)
